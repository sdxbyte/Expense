import { Request, Response } from 'express';
import crypto from 'crypto';

// In-memory short-lived state cache to prevent OAuth CSRF attacks
const activeStates = new Map<string, { createdAt: number; redirectUri: string }>();

// Periodic cleanup of expired state entries (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of activeStates.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      activeStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

export function getGoogleOAuthUrl(req: Request, res: Response) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        success: false,
        error: 'Google Sign-In is not configured on this server. Please provide GOOGLE_CLIENT_ID in environment settings.',
      });
    }

    // Determine absolute redirect URI dynamically
    const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    
    const fallbackOrigin = `${protocol}://${host}`;
    const baseUrl = appUrl || fallbackOrigin;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`;

    // Generate crypto-random state for OAuth CSRF protection
    const state = crypto.randomBytes(24).toString('hex');
    activeStates.set(state, { createdAt: Date.now(), redirectUri });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.json({
      success: true,
      url,
      redirectUri,
    });
  } catch (err: any) {
    console.error('Error generating Google OAuth URL:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate Google Sign-In authorization URL.',
    });
  }
}

export async function handleGoogleOAuthCallback(req: Request, res: Response) {
  const { code, state, error: googleError } = req.query;

  // Render helper for sending postMessage to popup opener
  const sendPopupResponse = (payload: { type: string; user?: any; error?: string }) => {
    const jsonPayload = JSON.stringify(payload);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Authentication</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .spinner {
              width: 32px;
              height: 32px;
              border: 3px solid rgba(255,255,255,0.1);
              border-radius: 50%;
              border-top-color: #6366f1;
              animation: spin 0.8s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <p>${payload.error ? 'Authentication failed. Closing window...' : 'Completing Google Sign-In...'}</p>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage(${jsonPayload}, '*');
                setTimeout(function() { window.close(); }, 300);
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              console.error(e);
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  };

  if (googleError) {
    console.warn('Google OAuth error callback:', googleError);
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Google authentication was canceled or declined.',
    });
  }

  if (!code || !state || typeof state !== 'string') {
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Invalid authorization request parameters.',
    });
  }

  // Validate state token against activeStates (OAuth CSRF protection)
  const stateData = activeStates.get(state);
  if (!stateData) {
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Authentication state expired or invalid. Please try signing in again.',
    });
  }
  activeStates.delete(state); // Prevent state replay attacks

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Google Sign-In server credentials are missing. Please configure GOOGLE_CLIENT_SECRET.',
    });
  }

  try {
    // 1. Exchange authorization code for Google access token & ID token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: stateData.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Google token exchange failed:', errBody);
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Failed to verify authorization code with Google.',
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'No access token returned from Google identity service.',
      });
    }

    // 2. Retrieve verified user profile from Google OpenID Connect userinfo endpoint
    const userinfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoResponse.ok) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Failed to fetch verified user profile from Google.',
      });
    }

    const userProfile = await userinfoResponse.json();

    // Verify email is verified by Google
    if (!userProfile.email || userProfile.email_verified === false) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Your Google email address is not verified by Google.',
      });
    }

    // Extract minimal user info securely
    const verifiedUser = {
      email: userProfile.email.toLowerCase(),
      name: userProfile.name || userProfile.given_name || 'Google User',
      sub: userProfile.sub,
      picture: userProfile.picture || '',
    };

    return sendPopupResponse({
      type: 'GOOGLE_AUTH_SUCCESS',
      user: verifiedUser,
    });
  } catch (err: any) {
    console.error('Error handling Google OAuth callback:', err);
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'An unexpected error occurred during Google authentication.',
    });
  }
}
