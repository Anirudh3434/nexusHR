import connectDB from './mongodb';
import Company from '@/models/Company';
import { resolveFeatures, type Feature } from './entitlements';

export const TRIAL_DAYS = 30;

export type SubscriptionStatus = 'trial' | 'active' | 'expired';

export interface SubscriptionState {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  daysLeft: number | null;
  plan: string | null;
  subscriptionEndsAt: string | null;
  /** Product features unlocked by the current plan + status. */
  features: Feature[];
}

/**
 * Resolves a company's subscription state. Handles legacy companies that
 * predate billing (no trial fields) by grandfathering them into a fresh
 * 30-day trial starting now — persisted once so the window is stable.
 * Trial → expired rollover is computed on read and persisted.
 */
export async function resolveSubscription(companyId: string): Promise<SubscriptionState> {
  await connectDB();
  const company = await Company.findById(companyId);
  if (!company) {
    return { status: 'expired', trialEndsAt: null, daysLeft: 0, plan: null, subscriptionEndsAt: null, features: [] };
  }

  const now = new Date();
  let dirty = false;

  if (!company.trialEndsAt) {
    company.trialStartsAt = now;
    company.trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    if (!company.subscriptionStatus || company.subscriptionStatus === 'expired') {
      company.subscriptionStatus = 'trial';
    }
    dirty = true;
  }

  let status: SubscriptionStatus = company.subscriptionStatus || 'trial';

  if (status === 'active' && company.subscriptionEndsAt && company.subscriptionEndsAt < now) {
    status = 'expired';
    company.subscriptionStatus = 'expired';
    dirty = true;
  }

  if (status === 'trial' && company.trialEndsAt && company.trialEndsAt < now) {
    status = 'expired';
    company.subscriptionStatus = 'expired';
    dirty = true;
  }

  if (dirty) {
    await company.save();
  }

  const end = status === 'active' ? company.subscriptionEndsAt : company.trialEndsAt;
  const daysLeft = end
    ? Math.max(0, Math.ceil((new Date(end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return {
    status,
    trialEndsAt: company.trialEndsAt ? new Date(company.trialEndsAt).toISOString() : null,
    daysLeft,
    plan: company.subscriptionPlan || null,
    subscriptionEndsAt: company.subscriptionEndsAt
      ? new Date(company.subscriptionEndsAt).toISOString()
      : null,
    features: resolveFeatures(company.subscriptionPlan || null, status),
  };
}
