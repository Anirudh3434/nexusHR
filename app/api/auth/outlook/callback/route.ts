import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailConfig from '@/models/EmailConfig';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/outlook/callback';

// GET - Handle Microsoft OAuth callback
export async function GET(req: Request) {
  try {
    // Get base URL from request headers
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(`${baseUrl}/email-settings?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/email-settings?error=missing_code_or_state`);
    }

    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      return NextResponse.redirect(`${baseUrl}/email-settings?error=oauth_not_configured`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`/email-settings?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    // Save tokens to database
    await connectDB();

    const companyId = state;
    const email = userInfo.mail || userInfo.userPrincipalName;

    // Update or create email config
    await EmailConfig.findOneAndUpdate(
      { companyId },
      {
        companyId,
        provider: 'outlook',
        careerEmail: email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Redirect back to settings page with success
    return NextResponse.redirect(`${baseUrl}/email-settings?success=outlook_connected`);

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    // Get base URL from request for error redirect
    const errorProtocol = req.headers.get('x-forwarded-proto') || 'https';
    const errorHost = req.headers.get('host') || 'localhost:3000';
    const errorBaseUrl = `${errorProtocol}://${errorHost}`;
    return NextResponse.redirect(`${errorBaseUrl}/email-settings?error=callback_error&details=${encodeURIComponent(error.message)}`);
  }
}
