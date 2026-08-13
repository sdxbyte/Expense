import { Request, Response } from 'express';
import crypto from 'crypto';

// In-memory short-lived state cache to prevent OAuth CSRF attacks and store PKCE code_verifier
interface OAuthStateRecord {
  createdAt: number;
  redirectUri: string;
  codeVerifier: string;
}

const activeStates = new Map<string, OAuthStateRecord>();

// Periodic cleanup of expired state entries (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of activeStates.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      activeStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Helper to determine current dynamic base redirect URI
 */
function getRedirectUri(req: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : '';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';

  const baseUrl = appUrl || `${protocol}://${host}`;
  return `${baseUrl}/api/auth/google/callback`;
}

/**
 * Resolves Google Client ID and Client Secret from available server environment variables
 */
function getGoogleCredentials() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.CLIENT_ID ||
    process.env.GMAIL_CLIENT_ID ||
    '';
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.CLIENT_SECRET ||
    process.env.GMAIL_CLIENT_SECRET ||
    '';
  return { clientId, clientSecret };
}

/**
 * Generates official Google OAuth 2.0 authorization URL with PKCE (S256)
 */
export function getGoogleOAuthUrl(req: Request, res: Response) {
  try {
    const { clientId } = getGoogleCredentials();
    const redirectUri = getRedirectUri(req);

    if (!clientId) {
      return res.json({
        success: false,
        configured: false,
        url: null,
        redirectUri,
        message: 'Google Sign-In CLIENT_ID is not configured in server environment variables.',
      });
    }

    // 1. Generate crypto-random state for OAuth CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // 2. Generate PKCE code_verifier (high-entropy cryptographic random string)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // 3. Generate PKCE code_challenge = BASE64URL-ENCODE(SHA256(code_verifier))
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Store state and codeVerifier in server session cache
    activeStates.set(state, {
      createdAt: Date.now(),
      redirectUri,
      codeVerifier,
    });

    // 4. Construct official Google authorization URL (accounts.google.com)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.json({
      success: true,
      configured: true,
      url,
      redirectUri,
    });
  } catch (err: any) {
    console.error('Error generating Google OAuth URL:', err);
    return res.status(500).json({
      success: false,
      configured: false,
      error: 'Failed to generate Google Sign-In authorization URL.',
    });
  }
}

/**
 * Decodes and verifies Google ID Token payload
 */
function verifyGoogleIdToken(idToken: string, expectedClientId: string) {
  if (!idToken) {
    throw new Error('No Google ID token provided in token response.');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Google ID token format.');
  }

  // Parse JWT Payload
  const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
  const payload = JSON.parse(payloadJson);

  const now = Math.floor(Date.now() / 1000);

  // 1. Verify Issuer
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid Google ID token issuer: ${payload.iss}`);
  }

  // 2. Verify Audience (Client ID)
  if (payload.aud !== expectedClientId) {
    throw new Error(`Google ID token audience mismatch. Expected ${expectedClientId}, got ${payload.aud}`);
  }

  // 3. Verify Expiration
  if (payload.exp && payload.exp < now) {
    throw new Error('Google ID token has expired.');
  }

  // 4. Verify Email Status
  if (payload.email_verified === false) {
    throw new Error('Google account email is not verified by Google.');
  }

  return payload;
}

/**
 * OAuth Callback Handler: Exchanges code for tokens, verifies Google ID Token & UserInfo
 */
export async function handleGoogleOAuthCallback(req: Request, res: Response) {
  const { code, state, error: googleError } = req.query;

  // Render helper for sending postMessage to popup opener or fallback redirect
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
            .msg {
              font-size: 14px;
              font-weight: 500;
              color: ${payload.error ? '#f87171' : '#a5b4fc'};
              text-align: center;
              padding: 0 16px;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <p class="msg">${payload.error ? payload.error : 'Google Sign-In verified! Redirecting to Expense vault...'}</p>
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

  // User canceled or denied access on Google login page
  if (googleError) {
    console.warn('Google OAuth error callback:', googleError);
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Google authentication was canceled or access was denied.',
    });
  }

  if (!code || !state || typeof state !== 'string') {
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Invalid authorization callback parameters.',
    });
  }

  // Validate state token against activeStates (OAuth CSRF protection)
  const stateData = activeStates.get(state);
  if (!stateData) {
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Authentication state expired or invalid CSRF token. Please try signing in again.',
    });
  }
  activeStates.delete(state); // Prevent replay attacks

  const { clientId, clientSecret } = getGoogleCredentials();

  if (!clientId || !clientSecret) {
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: 'Google Sign-In server credentials missing. Please configure GOOGLE_CLIENT_SECRET in server settings.',
    });
  }

  try {
    // 1. Exchange authorization code for Google access token & ID token with PKCE verification
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
        code_verifier: stateData.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Google token exchange failed:', errBody);
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Failed to verify authorization code with Google token service.',
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token: accessToken, id_token: idToken } = tokenData;

    if (!accessToken || !idToken) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Incomplete tokens returned from Google identity endpoint.',
      });
    }

    // 2. Validate Google ID Token (Issuer, Audience, Expiration, Email Verification)
    const verifiedIdToken = verifyGoogleIdToken(idToken, clientId);

    // 3. Fetch verified UserInfo from Google OpenID Connect endpoint for cross-validation
    const userinfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoResponse.ok) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Failed to retrieve verified user profile from Google OpenID service.',
      });
    }

    const userProfile = await userinfoResponse.json();

    // Verify sub matches between ID Token and UserInfo endpoint
    if (userProfile.sub !== verifiedIdToken.sub) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'Google user identity mismatch between ID token and userinfo endpoint.',
      });
    }

    // Ensure verified email exists
    const verifiedEmail = (userProfile.email || verifiedIdToken.email || '').toLowerCase();
    if (!verifiedEmail) {
      return sendPopupResponse({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'No verified email address associated with this Google account.',
      });
    }

    // Extract verified user metadata
    const verifiedUser = {
      email: verifiedEmail,
      name: userProfile.name || verifiedIdToken.name || 'Google User',
      sub: userProfile.sub,
      picture: userProfile.picture || verifiedIdToken.picture || '',
    };

    console.log(`[GOOGLE OAUTH SUCCESS] Verified identity for ${verifiedUser.email} (sub: ${verifiedUser.sub})`);

    return sendPopupResponse({
      type: 'GOOGLE_AUTH_SUCCESS',
      user: verifiedUser,
    });
  } catch (err: any) {
    console.error('Error in Google OAuth callback:', err);
    return sendPopupResponse({
      type: 'GOOGLE_AUTH_ERROR',
      error: err?.message || 'An unexpected error occurred during Google authentication.',
    });
  }
}
