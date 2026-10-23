"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  hasPermission,
  hasPermissionIn,
  canView,
  canViewIn,
  canCreate,
  canEdit,
  canDelete,
  canApprove,
  isRouteAccessible,
  isRouteAccessibleWith,
  getDataScope,
  type Role,
  type Module,
  type Permission,
  type DataScope,
  type RolePermissionMap,
} from "@/lib/permissions";

// Caller-effective matrices (role defaults + role overrides + the current
// user's individual overrides), fetched once per user per page load.
// Falls back to the hardcoded role defaults when the fetch fails or is pending.
const matrixCache = new Map<string, Promise<RolePermissionMap | null>>();

function loadUserMatrix(userId: string): Promise<RolePermissionMap | null> {
  let pending = matrixCache.get(userId);
  if (!pending) {
    pending = fetch("/api/permissions/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data?.matrix as RolePermissionMap | undefined) ?? null)
      .catch(() => null);
    matrixCache.set(userId, pending);
  }
  return pending;
}

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as Role) || "employee";
  const [loaded, setLoaded] = useState<{ key: string; matrix: RolePermissionMap } | null>(null);

  // Scope key changes with user/company; the loaded matrix only applies
  // when its key matches (never leaks one user's matrix into another's).
  const scopeKey =
    user?.id && user?.companyId && role !== "super_admin" ? user.id : null;
  const effective = loaded && scopeKey && loaded.key === scopeKey ? loaded.matrix : null;

  useEffect(() => {
    if (!scopeKey || !user?.id) return;
    const id = user.id;
    let cancelled = false;
    loadUserMatrix(id).then((matrix) => {
      if (!cancelled && matrix) setLoaded({ key: scopeKey, matrix });
    });
    return () => {
      cancelled = true;
    };
  }, [scopeKey, user?.id]);

  const check = (
    module: Module,
    permission: Permission,
    fallback: (r: Role, m: Module, p: Permission) => boolean
  ) => (effective ? hasPermissionIn(effective, module, permission) : fallback(role, module, permission));

  return {
    role,
    user,
    permissionsLoaded: effective !== null,
    
    // Permission checks (company overrides honored once loaded)
    hasPermission: (module: Module, permission: Permission) =>
      check(module, permission, hasPermission),
    
    canView: (module: Module) =>
      effective ? canViewIn(effective, module) : canView(role, module),
    canCreate: (module: Module) => check(module, "create", canCreate),
    canEdit: (module: Module) => check(module, "edit", canEdit),
    canDelete: (module: Module) => check(module, "delete", canDelete),
    canApprove: (module: Module) => check(module, "approve", canApprove),
    
    // Route access
    canAccessRoute: (route: string) =>
      effective
        ? isRouteAccessibleWith(role, route, (module) => canViewIn(effective, module))
        : isRouteAccessible(role, route),
    
    // Data scope for filtering
    getScope: (module: Module): DataScope => getDataScope(role, module),
    
    // Helper to check if user can perform action on specific resource
    canManageResource: (
      module: Module,
      action: Permission,
      resourceOwnerId?: string,
      resourceDepartment?: string
    ) => {
      // Check basic permission (company overrides honored once loaded)
      if (!check(module, action, hasPermission)) return false;
      
      // Super admin and admin can manage everything in scope
      if (role === "super_admin" || role === "admin") return true;
      
      // HR can manage within company
      if (role === "hr") return true;
      
      // Manager can only manage their team's resources
      if (role === "manager") {
        // If checking own resources
        if (resourceOwnerId === user?.id) return true;
        // If resource belongs to same department
        if (resourceDepartment && resourceDepartment === user?.department) return true;
        return false;
      }
      
      // Employee can only manage own resources
      if (role === "employee") {
        return resourceOwnerId === user?.id;
      }
      
      return false;
    },
    
    // Check if this is user's own resource
    isOwnResource: (resourceUserId: string) => resourceUserId === user?.id,
    
    // Check if user is in same department (for managers)
    isSameDepartment: (department?: string) => 
      role === "manager" && department === user?.department,
  };
}
