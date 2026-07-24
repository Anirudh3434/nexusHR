import { NextRequest, NextResponse } from "next/server";
import { hasPermission, canView, type Role, type Module, type Permission } from "./permissions";

// Get user info from request headers (set by middleware)
export interface RequestUser {
  id: string;
  role: Role;
  name: string;
  companyId: string;
  department?: string;
}

export function getUserFromRequest(req: NextRequest): RequestUser | null {
  const id = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role") as Role;
  const name = req.headers.get("x-user-name");
  const companyId = req.headers.get("x-company-id");

  if (!id || !role || !companyId) {
    return null;
  }

  return {
    id,
    role,
    name: name || "",
    companyId,
  };
}

// API route guard - checks permission and returns 403 if not authorized
export function apiGuard(
  req: NextRequest,
  module: Module,
  permission: Permission
): { authorized: true; user: RequestUser } | { authorized: false; response: NextResponse } {
  const user = getUserFromRequest(req);

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized - No user context" },
        { status: 401 }
      ),
    };
  }

  if (!hasPermission(user.role, module, permission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Forbidden - Missing ${permission} permission for ${module}` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

// Check if user can view module
export function canViewApi(req: NextRequest, module: Module) {
  return apiGuard(req, module, "view");
}

// Check if user can create
export function canCreateApi(req: NextRequest, module: Module) {
  return apiGuard(req, module, "create");
}

// Check if user can edit
export function canEditApi(req: NextRequest, module: Module) {
  return apiGuard(req, module, "edit");
}

// Check if user can delete
export function canDeleteApi(req: NextRequest, module: Module) {
  return apiGuard(req, module, "delete");
}

// Check if user can approve
export function canApproveApi(req: NextRequest, module: Module) {
  return apiGuard(req, module, "approve");
}

// Build MongoDB query based on user role for data filtering
export function buildDataQuery(
  user: RequestUser,
  baseQuery: Record<string, any> = {},
  options: {
    companyField?: string;
    ownerField?: string;
    departmentField?: string;
  } = {}
): Record<string, any> {
  const { companyField = "companyId", ownerField, departmentField } = options;

  // Super admin sees everything
  if (user.role === "super_admin") {
    return baseQuery;
  }

  // All other roles filter by company first
  const query = {
    ...baseQuery,
    [companyField]: user.companyId,
  };

  // Manager filters by department for team-specific resources
  if (user.role === "manager" && departmentField) {
    query[departmentField] = user.department;
  }

  // Employee only sees own data
  if (user.role === "employee" && ownerField) {
    query[ownerField] = user.id;
  }

  return query;
}

// Check if user can access specific resource
export function canAccessResource(
  user: RequestUser,
  resource: {
    companyId?: string;
    ownerId?: string;
    department?: string;
  }
): boolean {
  // Super admin can access everything
  if (user.role === "super_admin") return true;

  // Check company match
  if (resource.companyId && resource.companyId !== user.companyId) {
    return false;
  }

  // Manager can access their department's resources
  if (user.role === "manager") {
    if (resource.department && resource.department !== user.department) {
      return false;
    }
    return true;
  }

  // Employee can only access own resources
  if (user.role === "employee") {
    if (resource.ownerId && resource.ownerId !== user.id) {
      return false;
    }
    return true;
  }

  // Admin and HR can access company resources
  return true;
}

// Response helpers
export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse(message = "Not Found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}
