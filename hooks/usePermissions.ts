"use client";

import { useAuth } from "@/context/AuthContext";
import {
  hasPermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  canApprove,
  isRouteAccessible,
  getDataScope,
  type Role,
  type Module,
  type Permission,
  type DataScope,
} from "@/lib/permissions";

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as Role) || "employee";

  return {
    role,
    user,
    
    // Permission checks
    hasPermission: (module: Module, permission: Permission) =>
      hasPermission(role, module, permission),
    
    canView: (module: Module) => canView(role, module),
    canCreate: (module: Module) => canCreate(role, module),
    canEdit: (module: Module) => canEdit(role, module),
    canDelete: (module: Module) => canDelete(role, module),
    canApprove: (module: Module) => canApprove(role, module),
    
    // Route access
    canAccessRoute: (route: string) => isRouteAccessible(role, route),
    
    // Data scope for filtering
    getScope: (module: Module): DataScope => getDataScope(role, module),
    
    // Helper to check if user can perform action on specific resource
    canManageResource: (
      module: Module,
      action: Permission,
      resourceOwnerId?: string,
      resourceDepartment?: string
    ) => {
      // Check basic permission
      if (!hasPermission(role, module, action)) return false;
      
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
