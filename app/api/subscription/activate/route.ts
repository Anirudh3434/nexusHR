import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, getSessionCookieDomain, type SessionPayload } from '@/lib/auth';
import { resolveSubscription } from '@/lib/subscription';

const PLANS = ['starter', 'growth', 'business', 'complete', 'enterprise'] as const;

// PLACEHOLDER billing: marks the workspace subscribed without a gateway.
// Wire a real provider (Razorpay/Stripe) here later: create the provider
// order/subscription first, then flip status only on verified webhook.
export async function POST(req: Request) {
  const auth = await getAuthInfo();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!hasRole(auth.role, ['super_admin', 'admin'])) {
    return NextResponse.json({ message: 'Only workspace admins can manage billing' }, { status: 403 });
  }
  if (!auth.companyId) {
    return NextResponse.json({ message: 'No company context' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = typeof body.plan === 'string' ? body.plan : 'growth';
  if (!(PLANS as readonly string[]).includes(plan)) {
    return NextResponse.json({ message: 'Unknown plan' }, { status: 400 });
  }

  await connectDB();
  const now = new Date();
  const company = await Company.findByIdAndUpdate(
    auth.companyId,
    {
      subscriptionStatus: 'active',
      subscriptionPlan: plan,
      subscribedAt: now,
      // Placeholder term: 1 year. A real gateway webhook sets the true term.
      subscriptionEndsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    },
    { new: true }
  );
  if (!company) {
    return NextResponse.json({ message: 'Company not found' }, { status: 404 });
  }

  // Re-issue the caller's session with the new plan/features so plan
  // gating takes effect immediately (no sign-out required). Best-effort:
  // activation still succeeds if this fails — the next sign-in re-snapshots.
  const res = NextResponse.json(
    { message: 'Subscription activated', status: 'active', plan },
    { status: 200 }
  );
  try {
    const subscription = await resolveSubscription(auth.companyId);
    const dbUser = await User.findById(auth.userId);
    if (dbUser) {
      const { getEffectiveUserMap } = await import('@/lib/permission-overrides');
      const session: SessionPayload = {
        id: dbUser._id.toString(),
        role: dbUser.role,
        email: dbUser.email,
        companyId: auth.companyId,
        name: dbUser.name,
        isCandidate: !!dbUser.isCandidate,
        mustChangePassword: !!dbUser.mustChangePassword,
        tv: dbUser.tokenVersion ?? 0,
        perms: await getEffectiveUserMap(auth.companyId, dbUser._id.toString(), dbUser.role) as Record<string, string[]>,
        plan: subscription.plan ?? plan,
        features: subscription.features,
      };
      const token = signSession(session, '1d');
      const cookieDomain = getSessionCookieDomain(req.headers.get('host'));
      res.cookies.set(SESSION_COOKIE, token, {
        ...SESSION_COOKIE_OPTIONS,
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
    }
  } catch (error) {
    console.error('Session re-issue after activation failed:', error);
  }

  return res;
}
