export interface GmailSenderDiagnostic {
  sender: string;
  email: string;
  count: number;
  sampleSubject: string;
  sampleDate: string;
  sampleMessageId: string;
}

export interface DiagnosticResult {
  success: boolean;
  daysAnalyzed: number;
  totalMessagesFound: number;
  distinctSendersCount: number;
  senders: GmailSenderDiagnostic[];
  queryUsed: string;
  error?: string;
  envCheck: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasRefreshToken: boolean;
  };
}

/**
 * Obtains a fresh access token using long-lived OAuth refresh token credentials.
 */
export async function getGmailAccessToken(): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Gmail OAuth credentials. Please ensure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables are configured.'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await response.json()) as { access_token?: string; error?: string; error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Gmail OAuth Token Error (${response.status}): ${data.error_description || data.error || 'Failed to retrieve access token'}`
    );
  }

  return data.access_token;
}

/**
 * Diagnostic helper: Lists all distinct sender addresses over the past N days, ranked by count,
 * with a sample subject line for each sender.
 *
 * Search uses `in:anywhere` as required to prevent false 0-results from Gmail Trash/Spam filters.
 */
export async function runGmailSenderDiagnostic(days: number = 30): Promise<DiagnosticResult> {
  const hasClientId = Boolean(process.env.GMAIL_CLIENT_ID);
  const hasClientSecret = Boolean(process.env.GMAIL_CLIENT_SECRET);
  const hasRefreshToken = Boolean(process.env.GMAIL_REFRESH_TOKEN);

  const envCheck = { hasClientId, hasClientSecret, hasRefreshToken };

  if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
    return {
      success: false,
      daysAnalyzed: days,
      totalMessagesFound: 0,
      distinctSendersCount: 0,
      senders: [],
      queryUsed: '',
      error: 'Gmail credentials not configured in environment variables (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN).',
      envCheck,
    };
  }

  try {
    const accessToken = await getGmailAccessToken();

    // Calculate start date
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const dateStr = `${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()}`;
    const query = `in:anywhere after:${dateStr}`;

    // List messages
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=500`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Gmail API List Messages failed (${listRes.status}): ${errText}`);
    }

    const listData = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
    const messagesList = listData.messages || [];

    if (messagesList.length === 0) {
      return {
        success: true,
        daysAnalyzed: days,
        totalMessagesFound: 0,
        distinctSendersCount: 0,
        senders: [],
        queryUsed: query,
        envCheck,
      };
    }

    // Group senders
    const senderMap = new Map<
      string,
      {
        senderRaw: string;
        email: string;
        count: number;
        sampleSubject: string;
        sampleDate: string;
        sampleMessageId: string;
      }
    >();

    // Fetch message headers in batches (up to 50 concurrent requests for speed)
    const batchSize = 25;
    for (let i = 0; i < messagesList.length; i += batchSize) {
      const chunk = messagesList.slice(i, i + batchSize);
      await Promise.all(
        chunk.map(async (msgItem) => {
          try {
            const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
            const msgRes = await fetch(msgUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!msgRes.ok) return;

            const msgData = (await msgRes.json()) as {
              id: string;
              internalDate?: string;
              payload?: { headers?: { name: string; value: string }[] };
            };

            const headers = msgData.payload?.headers || [];
            const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
            const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
            const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';

            // Extract email address
            const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader.trim()];
            const extractedEmail = (emailMatch[1] || fromHeader.trim()).toLowerCase();

            const existing = senderMap.get(extractedEmail);
            if (existing) {
              existing.count += 1;
            } else {
              senderMap.set(extractedEmail, {
                senderRaw: fromHeader,
                email: extractedEmail,
                count: 1,
                sampleSubject: subjectHeader,
                sampleDate: dateHeader || (msgData.internalDate ? new Date(parseInt(msgData.internalDate, 10)).toISOString() : ''),
                sampleMessageId: msgData.id,
              });
            }
          } catch {
            // Ignore individual message fetch error
          }
        })
      );
    }

    // Rank senders by count descending
    const sortedSenders: GmailSenderDiagnostic[] = Array.from(senderMap.values())
      .map((item) => ({
        sender: item.senderRaw,
        email: item.email,
        count: item.count,
        sampleSubject: item.sampleSubject,
        sampleDate: item.sampleDate,
        sampleMessageId: item.sampleMessageId,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      daysAnalyzed: days,
      totalMessagesFound: messagesList.length,
      distinctSendersCount: sortedSenders.length,
      senders: sortedSenders,
      queryUsed: query,
      envCheck,
    };
  } catch (err: any) {
    return {
      success: false,
      daysAnalyzed: days,
      totalMessagesFound: 0,
      distinctSendersCount: 0,
      senders: [],
      queryUsed: `in:anywhere after:${days}d`,
      error: err?.message || 'Failed to run Gmail diagnostic query',
      envCheck,
    };
  }
}
