import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserPermission from '@/models/UserPermission';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import {
  PERMISSION_MATRIX,
  type Module,
  type Permission,
  type Role,
  type RolePermissionMap,
} from '@/lib/permissions';
import { getEffectiveRoleMap } from '@/lib/permission-overrides';

const MANAGE_ROLES = ['super_admin', 'admin'];
const VALID_PERMISSIONS: Permission[] = ['view', 'create', 'edit', 'delete', 'approve', 'manage'];

function resolveCompany(auth: { role: string; companyId?: string }, requested?: string | null) {
  const isSuperAdmin = auth.role === 'super_admin';
  if (requested) {
    if (!isSuperAdmin && requested !== auth.companyId) return { error: 'Forbidden: company mismatch' as const };
    return { companyId: requested };
  }
  if (isSuperAdmin) return { error: 'companyId is required' as const };
  if (!auth.companyId) return { error: 'Company scope required' as const };
  return { companyId: auth.companyId };
}

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((p) => set.has(p));
}

/**
 * GET /api/permissions/users?companyId=
 *   -> { users: [{ id, name, email, role, department, customized }] }
 * GET /api/permissions/users?companyId=&userId=
 *   -> { user, role, base, matrix, customized }
 * `base` is the user's effective ROLE map (inheritance source); `matrix` is
 * the effective per-user map; `customized[module]` marks cells that differ.
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

    const userId = searchParams.get('userId');

    // User list mode
    if (!userId) {
      const users = await User.find({ companyId, isCandidate: { $ne: true } })
        .select('name email role department isActive')
        .sort({ name: 1 })
        .lean();
      const overrides = await UserPermission.find({ companyId }).select('userId').lean();
      const counts = new Map<string, number>();
      for (const o of overrides as Array<{ userId: unknown }>) {
        const key = String(o.userId);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return NextResponse.json({
        users: users.map((u) => ({
          id: String(u._id),
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department || '',
          isActive: u.isActive !== false,
          customized: counts.get(String(u._id)) || 0,
        })),
      });
    }

    // Single-user matrix mode
    const target = await User.findOne({ _id: userId, companyId }).select('name email role department').lean();
    if (!target) return NextResponse.json({ message: 'User not found in this company' }, { status: 404 });
    const role = target.role as Role;

    const base = (await getEffectiveRoleMap(companyId, role)) as RolePermissionMap;
    const overrides = await UserPermission.find({ companyId, userId }).select('module permissions').lean();
    const byModule = new Map(
      (overrides as Array<{ module: string; permissions: string[] }>).map((o) => [o.module, [...o.permissions]])
    );

    const matrix: RolePermissionMap = { ...base };
    const customized: Record<string, boolean> = {};
    for (const mod of Object.keys(PERMISSION_MATRIX[role] || {})) {
      const baseList = [...(base[mod as Module] || [])];
      if (byModule.has(mod)) {
        const list = byModule.get(mod) as Permission[];
        matrix[mod as Module] = list;
        customized[mod] = !sameList(list, baseList);
      } else {
        matrix[mod as Module] = baseList;
        customized[mod] = false;
      }
    }

    return NextResponse.json({
      user: { id: String(target._id), name: target.name, email: target.email, role, department: target.department || '' },
      role,
      base,
      matrix,
      customized,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching user permissions';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * PUT /api/permissions/users { companyId, userId, module, permissions }
 * Upsert one per-user cell. Saving a cell identical to the user's effective
 * role permissions deletes the override (DB only holds diffs). Admin-only.
 */
export async function PUT(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, MANAGE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { companyId: requestedCompanyId, userId, module, permissions } = body as {
      companyId?: string;
      userId?: string;
      module?: string;
      permissions?: string[];
    };

    const resolved = resolveCompany(auth, requestedCompanyId ?? null);
    if ('error' in resolved) return NextResponse.json({ message: resolved.error }, { status: 403 });
    const { companyId } = resolved;

    if (!userId) return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    const target = await User.findOne({ _id: userId, companyId }).select('role').lean();
    if (!target) return NextResponse.json({ message: 'User not found in this company' }, { status: 404 });
    const role = target.role as Role;

    if (!module || !(module in (PERMISSION_MATRIX[role] || {}))) {
      return NextResponse.json({ message: 'Unknown module' }, { status: 400 });
    }
    if (!Array.isArray(permissions) || permissions.some((p) => !VALID_PERMISSIONS.includes(p as Permission))) {
      return NextResponse.json({ message: 'Invalid permissions list' }, { status: 400 });
    }

    const roleMap = (await getEffectiveRoleMap(companyId, role)) as RolePermissionMap;
    const base = [...(roleMap[module as Module] || [])];

    // No-op writes stay clean: identical-to-role deletes any stored override.
    if (sameList(permissions, base)) {
      await UserPermission.deleteOne({ companyId, userId, module });
    } else {
      await UserPermission.findOneAndUpdate(
        { companyId, userId, module },
        { $set: { permissions, updatedBy: auth.userId } },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ ok: true, reloginRequired: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error saving user permission';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions/users?companyId=&userId=&module?
 * Reset a user's overrides to inherit from their role: one cell or all.
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

    const userId = searchParams.get('userId');
    const mod = searchParams.get('module');
    if (!userId) return NextResponse.json({ message: 'userId is required' }, { status: 400 });

    const target = await User.findOne({ _id: userId, companyId }).select('_id').lean();
    if (!target) return NextResponse.json({ message: 'User not found in this company' }, { status: 404 });

    const filter: Record<string, string> = { companyId, userId };
    if (mod) filter.module = mod;
    const result = await UserPermission.deleteMany(filter);

    return NextResponse.json({ ok: true, deleted: result.deletedCount ?? 0, reloginRequired: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error resetting user permissions';
    return NextResponse.json({ message }, { status: 500 });
  }
}
