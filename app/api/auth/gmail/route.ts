import { NextResponse } from 'next/server';

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
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    if (!GMAIL_CLIENT_ID) {
      return NextResponse.json({ 
        message: 'Gmail OAuth not configured. Please set GMAIL_CLIENT_ID environment variable.' 
      }, { status: 500 });
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: companyId, // Pass companyId in state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('Gmail OAuth error:', error);
    return NextResponse.json({ message: 'OAuth failed', error: error.message }, { status: 500 });
  }
}
