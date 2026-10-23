import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';
import { getEffectiveUserMap } from '@/lib/permission-overrides';
import { PERMISSION_MATRIX, type Permission, type Role, type RolePermissionMap } from '@/lib/permissions';

function parsePerms(raw: string | null): RolePermissionMap | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const map: RolePermissionMap = {};
    for (const [module, perms] of Object.entries(parsed)) {
      if (!Array.isArray(perms) || !perms.every((p) => typeof p === 'string')) return null;
      (map as Record<string, Permission[]>)[module] = perms as Permission[];
    }
    return map;
  } catch {
    return null;
  }
}

/**
 * GET /api/permissions/me
 * Effective permission map for the CALLER (role defaults + company role
 * overrides + the caller's individual overrides), as snapshotted into the
 * session at sign-in. Prefers the session claim (forwarded by middleware as
 * `x-user-perms`) so the client stays consistent with what middleware and
 * API guards enforce; falls back to a live DB read for legacy sessions.
 */
export async function GET() {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // Platform admins are outside the module system — always full access.
    if (auth.role === 'super_admin' || !auth.companyId) {
      return NextResponse.json({ matrix: PERMISSION_MATRIX[auth.role as Role] || {}, source: 'defaults' });
    }

    const headerList = await headers();
    const fromSession = parsePerms(headerList.get('x-user-perms'));
    if (fromSession) {
      return NextResponse.json({ matrix: fromSession, source: 'session' });
    }

    const matrix = await getEffectiveUserMap(auth.companyId, auth.userId, auth.role as Role);
    return NextResponse.json({ matrix, source: 'live' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching permissions';
    return NextResponse.json({ message }, { status: 500 });
  }
}
