import connectDB from "./mongodb";
import RolePermission from "../models/RolePermission";
import UserPermission from "../models/UserPermission";
import {
  PERMISSION_MATRIX,
  type Module,
  type Permission,
  type Role,
  type RolePermissionMap,
} from "./permissions";

/** Roles customizable per company. super_admin is platform-level. */
export const CUSTOMIZABLE_ROLES = ["admin", "hr", "manager", "employee"] as const;

export type CustomizableRole = (typeof CUSTOMIZABLE_ROLES)[number];

export function isCustomizableRole(role: string): role is CustomizableRole {
  return (CUSTOMIZABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Effective permission map for one role in a company:
 * hardcoded defaults with stored override cells applied.
 * Login-time use only (no caching) — embedded into the session JWT.
 */
export async function getEffectiveRoleMap(
  companyId: string,
  role: Role
): Promise<RolePermissionMap> {
  const base = PERMISSION_MATRIX[role] || {};
  if (!companyId || role === "super_admin") {
    return { ...(base as RolePermissionMap) };
  }
  await connectDB();
  const overrides = await RolePermission.find({ companyId, role })
    .select("module permissions")
    .lean();
  const effective: RolePermissionMap = { ...(base as RolePermissionMap) };
  for (const o of overrides as Array<{ module: string; permissions: string[] }>) {
    effective[o.module as Module] = [...(o.permissions as Permission[])];
  }
  return effective;
}

/** All override cells for a company (manager UI + audits). */
export async function getCompanyOverrides(
  companyId: string
): Promise<Array<{ role: string; module: string; permissions: string[] }>> {
  await connectDB();
  const docs = await RolePermission.find({ companyId })
    .select("role module permissions updatedAt")
    .lean();
  return (docs as Array<{ role: string; module: string; permissions: string[] }>).map(
    (d) => ({ role: d.role, module: d.module, permissions: [...d.permissions] })
  );
}

/**
 * Effective permission map for a single user:
 * role defaults + company role overrides + per-user overrides (highest).
 * Login-time use only (no caching) — embedded into the session JWT so
 * middleware/API guards can enforce it edge-safe without a DB read.
 */
export async function getEffectiveUserMap(
  companyId: string,
  userId: string,
  role: Role
): Promise<RolePermissionMap> {
  const base = await getEffectiveRoleMap(companyId, role);
  if (!companyId || !userId || role === "super_admin") return base;

  await connectDB();
  const overrides = await UserPermission.find({ companyId, userId })
    .select("module permissions")
    .lean();

  const effective: RolePermissionMap = { ...base };
  for (const o of overrides as Array<{ module: string; permissions: string[] }>) {
    effective[o.module as Module] = [...(o.permissions as Permission[])];
  }
  return effective;
}
