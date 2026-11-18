import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, getSessionCookieDomain } from '@/lib/auth';

// Clears the HttpOnly session cookie across all domain scopes.
export async function POST(req: Request) {
  const res = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  const domain = getSessionCookieDomain(req.headers.get('host'));

  // 1. Clear domain-scoped cookie if applicable
  if (domain) {
    res.cookies.set(SESSION_COOKIE, '', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
      expires: new Date(0),
      domain,
    });
  }

  // 2. Clear host-only cookie
  res.cookies.set(SESSION_COOKIE, '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });

  return res;
}

export async function GET(req: Request) {
  return POST(req);
}
