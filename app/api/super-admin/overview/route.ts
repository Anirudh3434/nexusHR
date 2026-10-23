import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';
import Onboarding from '@/models/Onboarding';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

// Platform overview for super_admin: companies, users, subscriptions.
export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!hasRole(auth.role, ['super_admin'])) {
    return NextResponse.json({ message: 'Super admin only' }, { status: 403 });
  }

  await connectDB();
  // Companies predating billing have no status field — they resolve to
  // trial via grandfathering (see lib/subscription.ts), so count them so.
  const trialQuery = { $or: [{ subscriptionStatus: 'trial' }, { subscriptionStatus: { $exists: false } }] };
  const [companyCount, userCount, trialCount, activeCount, expiredCount, roleBreakdown, companies, recentUsers, headcounts, onboardingStats] =
    await Promise.all([
      Company.countDocuments({}),
      User.countDocuments({}),
      Company.countDocuments(trialQuery),
      Company.countDocuments({ subscriptionStatus: 'active' }),
      Company.countDocuments({ subscriptionStatus: 'expired' }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Company.find({})
        .select('name code email subscriptionStatus subscriptionPlan trialEndsAt onboardingComplete registrationStep createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      User.find({}).select('name email role companyId createdAt').sort({ createdAt: -1 }).limit(8).lean(),
      User.aggregate([{ $group: { _id: '$companyId', count: { $sum: 1 } } }]),
      Onboarding.aggregate([
        { $group: { _id: { company: '$companyId', status: '$status' }, count: { $sum: 1 } } },
      ]),
    ]);

  const headcountByCompany: Record<string, number> = {};
  for (const h of headcounts as { _id: unknown; count: number }[]) {
    if (h._id) headcountByCompany[String(h._id)] = h.count;
  }

  const onboardingByCompany: Record<string, { inProgress: number; completed: number; draft: number }> = {};
  for (const o of onboardingStats as { _id: { company: unknown; status: string }; count: number }[]) {
    const key = o._id?.company ? String(o._id.company) : '';
    if (!key) continue;
    const entry = onboardingByCompany[key] || { inProgress: 0, completed: 0, draft: 0 };
    if (o._id.status === 'completed') entry.completed += o.count;
    else if (o._id.status === 'draft') entry.draft += o.count;
    else if (['offer_sent', 'offer_accepted', 'in_progress'].includes(o._id.status)) entry.inProgress += o.count;
    onboardingByCompany[key] = entry;
  }

  const companyDetails = (companies as any[]).map((c) => ({
    id: String(c._id),
    name: c.name,
    code: c.code,
    status: c.subscriptionStatus || 'trial',
    plan: c.subscriptionPlan || (c.subscriptionStatus === 'active' ? 'active' : 'trial'),
    trialEndsAt: c.trialEndsAt || null,
    onboardingComplete: !!c.onboardingComplete,
    registrationStep: c.registrationStep ?? null,
    createdAt: c.createdAt,
    employeeCount: headcountByCompany[String(c._id)] || 0,
    onboarding: onboardingByCompany[String(c._id)] || { inProgress: 0, completed: 0, draft: 0 },
  }));

  return NextResponse.json({
    companies: { total: companyCount, trial: trialCount, active: activeCount, expired: expiredCount },
    users: { total: userCount, byRole: roleBreakdown },
    companyDetails,
    recentUsers,
  }, { status: 200 });
}
