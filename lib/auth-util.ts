import { headers } from 'next/headers';
import { verifySessionToken } from './auth';
import connectDB from './mongodb';
import User from '../models/User';
import SuperAdmin from '../models/SuperAdmin';
import { coerceFeatures, type Feature } from './entitlements';

export interface AuthInfo {
  userId: string;
  role: string;
  companyId?: string;
  email?: string;
  /** Subscription plan id (from the verified session claim). */
  plan?: string;
  /** Features unlocked by the plan (from the verified session claim). */
  features?: Feature[];
}

function parseFeatures(raw: string | null): Feature[] | undefined {
  if (!raw) return undefined;
  try {
    return coerceFeatures(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/**
 * Returns the caller's identity from a VERIFIED source only:
 * 1. `x-user-*` headers — set exclusively by middleware from a
 *    signature-verified session cookie. Middleware strips any
 *    client-sent values when there is no valid session, so a
 *    present header means "verified upstream".
 * 2. `Authorization: Bearer` JWT (mobile app) — verified here.
 * Anything else returns null. Callers must 401 on null.
 */
export async function getAuthInfo(): Promise<AuthInfo | null> {
  try {
    const headersList = await headers();

    // 1. Middleware-verified session (web / HttpOnly cookie flow)
    const headerUserId = headersList.get('x-user-id');
    if (headerUserId) {
      return {
        userId: headerUserId,
        role: headersList.get('x-user-role') || 'employee',
        companyId: headersList.get('x-company-id') || undefined,
        email: headersList.get('x-user-email') || undefined,
        plan: headersList.get('x-user-plan') || undefined,
        features: parseFeatures(headersList.get('x-user-features')),
      };
    }

    // 2. Authorization header (mobile / token-based flow)
    const authHeader = headersList.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const session = verifySessionToken(token);

      if (session) {
        // Token-version revocation check (mobile 30d tokens).
        // Header/middleware path above is unchanged — no token available there.
        // Owner may live in either collection (company users vs platform admins).
        try {
          await connectDB();
          let currentTv: number | null = null;
          const user = await User.findById(session.id).select('tokenVersion').lean() as any;
          if (user) {
            currentTv = user.tokenVersion ?? 0;
          } else {
            const platform = await SuperAdmin.findById(session.id).select('tokenVersion').lean() as any;
            if (!platform) return null;
            currentTv = platform.tokenVersion ?? 0;
          }
          const sessionTv = (session as any).tv ?? 0;
          if (currentTv !== sessionTv) return null;
        } catch {
          return null;
        }
        return {
          userId: session.id,
          role: session.role || 'employee',
          companyId: session.companyId,
          email: session.email,
          plan: session.plan,
          features: coerceFeatures(session.features),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Auth Utility Error:', error);
    return null;
  }
}
