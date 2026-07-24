import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailConfig from '@/models/EmailConfig';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

// GET - Handle Gmail OAuth callback
export async function GET(req: Request) {
  try {
    // Get base URL from request headers
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // Contains companyId

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/email-settings?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/email-settings?error=missing_code_or_state`);
    }

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      return NextResponse.redirect(`${baseUrl}/email-settings?error=oauth_not_configured`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`/email-settings?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    // Get user info from Gmail API (works with Gmail scopes)
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    let email = 'unknown@gmail.com';
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      email = profile.emailAddress || email;
      console.log('Gmail profile:', profile);
    } else {
      console.warn('Failed to fetch Gmail profile, using fallback email');
    }

    // Save tokens to database
    await connectDB();

    const companyId = state;

    // Update or create email config
    await EmailConfig.findOneAndUpdate(
      { companyId },
      {
        companyId,
        provider: 'gmail',
        careerEmail: email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
        isActive: true,
      },
      { upsert: true }
    );
    
    console.log('Gmail OAuth: Tokens saved', {
      companyId,
      email,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token
    });

    // Redirect back to settings page with success
    return NextResponse.redirect(`${baseUrl}/email-settings?success=gmail_connected`);

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    // Get base URL from request for error redirect
    const errorProtocol = req.headers.get('x-forwarded-proto') || 'https';
    const errorHost = req.headers.get('host') || 'localhost:3000';
    const errorBaseUrl = `${errorProtocol}://${errorHost}`;
    return NextResponse.redirect(`${errorBaseUrl}/email-settings?error=callback_error&details=${encodeURIComponent(error.message)}`);
  }
}
