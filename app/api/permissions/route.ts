import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RolePermission from '@/models/RolePermission';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import {
  PERMISSION_MATRIX,
  type Module,
  type Permission,
  type Role,
  type RolePermissionMap,
} from '@/lib/permissions';
import { isCustomizableRole } from '@/lib/permission-overrides';

const MANAGE_ROLES = ['super_admin', 'admin'];
const VALID_PERMISSIONS: Permission[] = ['view', 'create', 'edit', 'delete', 'approve', 'manage'];
const CUSTOMIZABLE: Role[] = ['admin', 'hr', 'manager', 'employee'];

type EffectiveMatrix = Record<string, RolePermissionMap>;

function resolveCompany(auth: { role: string; companyId?: string }, requested?: string | null) {
  const isSuperAdmin = auth.role === 'super_admin';
  if (requested) {
    if (!isSuperAdmin && requested !== auth.companyId) return { error: 'Forbidden: company mismatch' as const };
    return { companyId: requested };
  }
  if (isSuperAdmin) {
    // Platform admins manage one company at a time — require explicit scope.
    return { error: 'companyId is required' as const };
  }
  if (!auth.companyId) return { error: 'Company scope required' as const };
  return { companyId: auth.companyId };
}

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((p) => set.has(p));
}

/**
 * GET /api/permissions?companyId=
 * Full effective matrix (defaults + overrides) for every customizable role,
 * plus which cells differ from the default. Any authenticated member of the
 * company may read (the matrix mirrors UI they can already see).
 */
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const resolved = resolveCompany(auth, searchParams.get('companyId'));
    if ('error' in resolved) return NextResponse.json({ message: resolved.error }, { status: 403 });
    const { companyId } = resolved;

    const overrides = await RolePermission.find({ companyId }).select('role module permissions').lean();
    const byCell = new Map(
      (overrides as Array<{ role: string; module: string; permissions: string[] }>).map((o) => [
        `${o.role}:${o.module}`,
        [...o.permissions],
      ])
    );

    const matrix: EffectiveMatrix = {};
    const customized: Record<string, Record<string, boolean>> = {};
    for (const role of CUSTOMIZABLE) {
      const base = PERMISSION_MATRIX[role] as RolePermissionMap;
      matrix[role] = {};
      customized[role] = {};
      for (const [module, defaults] of Object.entries(base)) {
        const key = `${role}:${module}`;
        if (byCell.has(key)) {
          matrix[role][module as Module] = byCell.get(key) as Permission[];
          customized[role][module] = !sameList(byCell.get(key)!, [...(defaults || [])]);
        } else {
          matrix[role][module as Module] = [...(defaults || [])];
          customized[role][module] = false;
        }
      }
    }

    return NextResponse.json({ matrix, customized, roles: CUSTOMIZABLE });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching permissions';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * PUT /api/permissions { companyId, role, module, permissions }
 * Upsert one cell. Saving a cell identical to the default deletes the
 * stored override instead (DB only holds diffs). Admin-only.
 */
export async function PUT(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, MANAGE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { companyId: requestedCompanyId, role, module, permissions } = body as {
      companyId?: string;
      role?: string;
      module?: string;
      permissions?: string[];
    };

    const resolved = resolveCompany(auth, requestedCompanyId ?? null);
    if ('error' in resolved) return NextResponse.json({ message: resolved.error }, { status: 403 });
    const { companyId } = resolved;

    if (!role || !isCustomizableRole(role)) {
      return NextResponse.json({ message: 'Only admin, hr, manager, employee roles can be customized' }, { status: 400 });
    }
    if (!module || !(module in (PERMISSION_MATRIX[role as Role] || {}))) {
      return NextResponse.json({ message: 'Unknown module' }, { status: 400 });
    }
    if (!Array.isArray(permissions) || permissions.some((p) => !VALID_PERMISSIONS.includes(p as Permission))) {
      return NextResponse.json({ message: 'Invalid permissions list' }, { status: 400 });
    }

    const defaults = [...((PERMISSION_MATRIX[role as Role] as RolePermissionMap)[module as Module] || [])];
    // No-op writes stay clean: identical-to-default deletes any stored override.
    if (sameList(permissions, defaults)) {
      await RolePermission.deleteOne({ companyId, role, module });
    } else {
      await RolePermission.findOneAndUpdate(
        { companyId, role, module },
        { $set: { permissions, updatedBy: (auth as { userId: string }).userId } },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ ok: true, reloginRequired: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error saving permission';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions?companyId=&role?=&module?
 * Reset overrides to defaults: one cell (role+module), one role, or all.
 * Admin-only.
 */
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, MANAGE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const resolved = resolveCompany(auth, searchParams.get('companyId'));
    if ('error' in resolved) return NextResponse.json({ message: resolved.error }, { status: 403 });
    const { companyId } = resolved;

    const role = searchParams.get('role');
    const mod = searchParams.get('module');
    if (role && !isCustomizableRole(role)) {
      return NextResponse.json({ message: 'Only admin, hr, manager, employee roles can be reset' }, { status: 400 });
    }

    const filter: Record<string, string> = { companyId };
    if (role) filter.role = role;
    if (mod) filter.module = mod;
    const result = await RolePermission.deleteMany(filter);

    return NextResponse.json({ ok: true, deleted: result.deletedCount ?? 0, reloginRequired: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error resetting permissions';
    return NextResponse.json({ message }, { status: 500 });
  }
}
