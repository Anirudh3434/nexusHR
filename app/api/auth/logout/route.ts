import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, getSessionCookieDomain } from '@/lib/auth';

// Clears the HttpOnly session cookie (same domain attributes as at issue,
// otherwise the cookie orphans). The client also drops its local copy.
export async function POST(req: Request) {
  const res = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  const domain = getSessionCookieDomain(req.headers.get('host'));
  res.cookies.set(SESSION_COOKIE, '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
  return res;
}
