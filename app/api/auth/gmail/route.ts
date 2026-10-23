import { NextResponse } from 'next/server';
import { getAuthInfo } from '@/lib/auth-util';
import { signState } from '@/lib/oauth-state';

// Gmail OAuth configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

// GET - Start Gmail OAuth flow
export async function GET(req: Request) {
  try {
    // Require auth; companyId comes from the verified SESSION only (query ignored).
    const auth = await getAuthInfo();
    if (!auth || !auth.companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const companyId = auth.companyId;

    if (!GMAIL_CLIENT_ID) {
      return NextResponse.json({
        message: 'Gmail OAuth not configured. Please set GMAIL_CLIENT_ID environment variable.'
      }, { status: 500 });
    }

    const state = signState({ companyId, userId: auth.userId });

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('Gmail OAuth error:', error);
    return NextResponse.json({ message: 'OAuth failed', error: error.message }, { status: 500 });
  }
}
