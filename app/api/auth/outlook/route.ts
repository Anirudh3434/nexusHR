import { NextResponse } from 'next/server';

// Microsoft OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/outlook/callback';

const SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/User.Read',
  'offline_access',
];

// GET - Start Microsoft OAuth flow
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    if (!MICROSOFT_CLIENT_ID) {
      return NextResponse.json({ 
        message: 'Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID environment variable.' 
      }, { status: 500 });
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      response_mode: 'query',
      state: companyId,
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    // Redirect to Microsoft OAuth
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('Outlook OAuth error:', error);
    return NextResponse.json({ message: 'OAuth failed', error: error.message }, { status: 500 });
  }
}
