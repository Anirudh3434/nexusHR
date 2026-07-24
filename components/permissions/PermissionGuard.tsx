"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { type Module, type Permission } from "@/lib/permissions";
import { ReactNode } from "react";

interface PermissionGuardProps {
  module: Module;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

// Only renders children if user has specific permission
export function PermissionGuard({
  module,
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  
  if (hasPermission(module, permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// Individual permission components
export function CanView({ module, children, fallback }: { module: Module; children: ReactNode; fallback?: ReactNode }) {
  const { canView } = usePermissions();
  return canView(module) ? <>{children}</> : <>{fallback}</>;
}

export function CanCreate({ module, children, fallback }: { module: Module; children: ReactNode; fallback?: ReactNode }) {
  const { canCreate } = usePermissions();
  return canCreate(module) ? <>{children}</> : <>{fallback}</>;
}

export function CanEdit({ module, children, fallback }: { module: Module; children: ReactNode; fallback?: ReactNode }) {
  const { canEdit } = usePermissions();
  return canEdit(module) ? <>{children}</> : <>{fallback}</>;
}

export function CanDelete({ module, children, fallback }: { module: Module; children: ReactNode; fallback?: ReactNode }) {
  const { canDelete } = usePermissions();
  return canDelete(module) ? <>{children}</> : <>{fallback}</>;
}

export function CanApprove({ module, children, fallback }: { module: Module; children: ReactNode; fallback?: ReactNode }) {
  const { canApprove } = usePermissions();
  return canApprove(module) ? <>{children}</> : <>{fallback}</>;
}

// Resource ownership check - for managing specific resources
interface ResourceGuardProps {
  module: Module;
  action: Permission;
  resourceOwnerId?: string;
  resourceDepartment?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ResourceGuard({
  module,
  action,
  resourceOwnerId,
  resourceDepartment,
  children,
  fallback = null,
}: ResourceGuardProps) {
  const { canManageResource } = usePermissions();
  
  if (canManageResource(module, action, resourceOwnerId, resourceDepartment)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// Role-based component
interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { role } = usePermissions();
  
  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

// Admin-only component
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

// HR and above
export function HRAndAbove({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "admin", "hr"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

// Manager and above (not regular employees)
export function ManagerAndAbove({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={["super_admin", "admin", "hr", "manager"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
