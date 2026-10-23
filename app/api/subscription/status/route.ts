import { NextResponse } from 'next/server';
import { getAuthInfo } from '@/lib/auth-util';
import { resolveSubscription } from '@/lib/subscription';
import { ALL_FEATURES } from '@/lib/entitlements';

// Session company's trial/subscription state. Users without a company
// (platform super_admin) are not gated.
export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!auth.companyId) {
    return NextResponse.json(
      { status: 'active', trialEndsAt: null, daysLeft: null, plan: 'platform', subscriptionEndsAt: null, features: ALL_FEATURES },
      { status: 200 }
    );
  }
  const state = await resolveSubscription(auth.companyId);
  return NextResponse.json(state, { status: 200 });
}
