export type Role = "super_admin" | "admin" | "hr" | "manager" | "employee";

export type Permission =
  | "view" | "create" | "edit" | "delete" | "approve" | "manage";

export type Module =
  | "dashboard"
  | "company"
  | "users"
  | "recruitment"
  | "employees"
  | "departments"
  | "designations"
  | "attendance"
  | "leave"
  | "leave_types"
  | "payroll"
  | "expenses"
  | "tickets"
  | "resignations"
  | "terminations"
  | "notices"
  | "holidays"
  | "reports"
  | "settings"
  | "surveys"
  | "projects"
  | "tasks"
  | "project_documents"
  | "project_notes"
  | "project_credentials"
  | "project_resources"
  | "project_onboarding";

// Permission matrix: role -> module -> permissions
const PERMISSION_MATRIX: Record<Role, Record<Module, Permission[]>> = {
  super_admin: {
    dashboard: ["view", "manage"],
    company: ["view", "create", "edit", "delete", "manage"],
    users: ["view", "create", "edit", "delete", "manage"],
    recruitment: ["view", "create", "edit", "delete", "manage"],
    employees: ["view", "create", "edit", "delete", "manage"],
    departments: ["view", "create", "edit", "delete", "manage"],
    designations: ["view", "create", "edit", "delete", "manage"],
    attendance: ["view", "create", "edit", "delete", "manage"],
    leave: ["view", "create", "edit", "delete", "approve", "manage"],
    leave_types: ["view", "create", "edit", "delete", "manage"],
    payroll: ["view", "create", "edit", "delete", "manage"],
    expenses: ["view", "create", "edit", "delete", "approve", "manage"],
    tickets: ["view", "create", "edit", "delete", "manage"],
    resignations: ["view", "create", "edit", "delete", "approve", "manage"],
    terminations: ["view", "create", "edit", "delete", "manage"],
    notices: ["view", "create", "edit", "delete", "manage"],
    holidays: ["view", "create", "edit", "delete", "manage"],
    reports: ["view", "manage"],
    settings: ["view", "create", "edit", "delete", "manage"],
    surveys: ["view", "create", "edit", "delete", "manage"],
    projects: ["view", "create", "edit", "delete", "manage"],
    tasks: ["view", "create", "edit", "delete", "manage"],
    project_documents: ["view", "create", "edit", "delete", "manage"],
    project_notes: ["view", "create", "edit", "delete", "manage"],
    project_credentials: ["view", "create", "edit", "delete", "manage"],
    project_resources: ["view", "create", "edit", "delete", "manage"],
    project_onboarding: ["view", "create", "edit", "delete", "manage"],
  },
  admin: {
    dashboard: ["view", "manage"],
    company: ["view"],
    users: ["view", "create", "edit", "delete", "manage"],
    recruitment: ["view", "create", "edit", "delete", "manage"],
    employees: ["view", "create", "edit", "delete", "manage"],
    departments: ["view", "create", "edit", "delete", "manage"],
    designations: ["view", "create", "edit", "delete", "manage"],
    attendance: ["view", "create", "edit", "delete", "manage"],
    leave: ["view", "create", "edit", "delete", "approve", "manage"],
    leave_types: ["view", "create", "edit", "delete", "manage"],
    payroll: ["view", "create", "edit", "delete", "manage"],
    expenses: ["view", "create", "edit", "delete", "approve", "manage"],
    tickets: ["view", "create", "edit", "delete", "manage"],
    resignations: ["view", "create", "edit", "delete", "approve", "manage"],
    terminations: ["view", "create", "edit", "delete", "manage"],
    notices: ["view", "create", "edit", "delete", "manage"],
    holidays: ["view", "create", "edit", "delete", "manage"],
    reports: ["view", "manage"],
    settings: ["view", "create", "edit", "manage"],
    surveys: ["view", "create", "edit", "delete", "manage"],
    projects: ["view", "create", "edit", "delete", "manage"],
    tasks: ["view", "create", "edit", "delete", "manage"],
    project_documents: ["view", "create", "edit", "delete", "manage"],
    project_notes: ["view", "create", "edit", "delete", "manage"],
    project_credentials: ["view", "create", "edit", "delete", "manage"],
    project_resources: ["view", "create", "edit", "delete", "manage"],
    project_onboarding: ["view", "create", "edit", "delete", "manage"],
  },
  hr: {
    dashboard: ["view"],
    company: [],
    users: ["view"],
    recruitment: ["view", "create", "edit", "delete", "manage"],
    employees: ["view", "edit"],
    departments: ["view"],
    designations: ["view"],
    attendance: ["view", "manage"],
    leave: ["view", "create", "edit", "approve", "manage"],
    leave_types: ["view"],
    payroll: ["view"],
    expenses: ["view", "create", "edit", "approve", "manage"],
    tickets: ["view", "create", "edit", "manage"],
    resignations: ["view", "create", "edit", "approve", "manage"],
    terminations: ["view", "create", "edit", "manage"],
    notices: ["view", "create", "edit"],
    holidays: ["view"],
    reports: ["view"],
    settings: [],
    surveys: ["view", "create", "edit", "delete", "manage"],
    projects: ["view", "create", "edit", "delete", "manage"],
    tasks: ["view", "create", "edit", "delete", "manage"],
    project_documents: ["view", "create", "edit", "delete", "manage"],
    project_notes: ["view", "create", "edit", "delete", "manage"],
    project_credentials: ["view", "create", "edit", "delete", "manage"],
    project_resources: ["view", "create", "edit", "delete", "manage"],
    project_onboarding: ["view", "create", "edit", "delete", "manage"],
  },
  manager: {
    dashboard: ["view"],
    company: [],
    users: [],
    recruitment: ["view"],
    employees: ["view"], // Team only - filtered in query
    departments: [],
    designations: [],
    attendance: ["view"], // Team only
    leave: ["view", "approve"], // Team only
    leave_types: ["view"],
    payroll: [],
    expenses: ["view", "approve"], // Team only
    tickets: ["view"],
    resignations: ["view"], // Team only
    terminations: [],
    notices: ["view"],
    holidays: ["view"],
    reports: ["view"], // Team only
    settings: [],
    surveys: ["view"],
    projects: ["view", "create", "edit", "delete", "manage"],
    tasks: ["view", "create", "edit", "delete", "manage"],
    project_documents: ["view", "create", "edit", "delete", "manage"],
    project_notes: ["view", "create", "edit", "delete", "manage"],
    project_credentials: ["view", "create", "edit", "delete", "manage"],
    project_resources: ["view", "create", "edit", "delete", "manage"],
    project_onboarding: ["view", "create", "edit", "delete", "manage"],
  },
  employee: {
    dashboard: ["view"],
    company: [],
    users: [],
    recruitment: [],
    employees: ["view"], // Self only
    departments: [],
    designations: [],
    attendance: ["view", "create"], // Self only (check-in/out)
    leave: ["view", "create"], // Self only
    leave_types: ["view"],
    payroll: ["view"], // Own payslip only
    expenses: ["view", "create"], // Self only
    tickets: ["view", "create"], // Self only
    resignations: ["view", "create"], // Self only
    terminations: [],
    notices: ["view"],
    holidays: ["view"],
    reports: [],
    settings: [],
    surveys: ["view", "create"],
    projects: ["view"],
    tasks: ["view", "create"],
    project_documents: ["view"],
    project_notes: ["view", "create"],
    project_credentials: [],
    project_resources: ["view"],
    project_onboarding: ["view"],
  },
};

// Check if user has specific permission
export function hasPermission(
  role: Role,
  module: Module,
  permission: Permission
): boolean {
  const permissions = PERMISSION_MATRIX[role]?.[module] || [];
  return permissions.includes(permission) || permissions.includes("manage");
}

// Check if user can view a module
export function canView(role: Role, module: Module): boolean {
  return hasPermission(role, module, "view");
}

// Check if user can create
export function canCreate(role: Role, module: Module): boolean {
  return hasPermission(role, module, "create");
}

// Check if user can edit
export function canEdit(role: Role, module: Module): boolean {
  return hasPermission(role, module, "edit");
}

// Check if user can delete
export function canDelete(role: Role, module: Module): boolean {
  return hasPermission(role, module, "delete");
}

// Check if user can approve
export function canApprove(role: Role, module: Module): boolean {
  return hasPermission(role, module, "approve");
}

// Get all modules user has access to
export function getAccessibleModules(role: Role): Module[] {
  return Object.entries(PERMISSION_MATRIX[role] || [])
    .filter(([, perms]) => perms.length > 0)
    .map(([module]) => module as Module);
}

// Check if route is accessible by role
export function isRouteAccessible(role: Role, route: string): boolean {
  const routeModuleMap: Record<string, Module> = {
    "/dashboard": "dashboard",
    "/applicants": "recruitment",
    "/recruitment-inbox": "recruitment",
    "/job-positions": "recruitment",
    "/email-settings": "recruitment",
    "/employees": "employees",
    "/tickets": "tickets",
    "/resignations": "resignations",
    "/terminations": "terminations",
    "/expenses": "expenses",
    "/departments": "departments",
    "/designations": "designations",
    "/shifts": "attendance",
    "/attendance": "attendance",
    "/leaves": "leave",
    "/leave-types": "leave_types",
    "/leave-entitlements": "leave_types",
    "/payroll": "payroll",
    "/notices": "notices",
    "/holidays": "holidays",
    "/reports": "reports",
    "/settings": "settings",
    "/company": "company",
    "/users": "users",
    // Survey routes
    "/surveys": "surveys",
    "/my-surveys": "surveys",
    // Employee self-service routes
    "/profile": "employees",
    "/my-attendance": "attendance",
    "/today-tasks": "attendance",
    "/my-leaves": "leave",
    "/my-tickets": "tickets",
    "/my-resignation": "resignations",
    "/my-expenses": "expenses",
    "/payslips": "payroll",
    "/team": "employees",
    "/team-attendance": "attendance",
    "/leave-approvals": "leave",
    "/performance": "employees",
    "/employee-shifts": "attendance",
    "/overtime": "attendance",
    // Project Management routes
    "/projects": "projects",
    "/tasks": "tasks",
    "/my-projects": "projects",
    "/my-tasks": "tasks",
    // Project Docs routes
    "/projects/[id]/docs": "project_documents",
  };

  // Find matching module
  for (const [routePattern, module] of Object.entries(routeModuleMap)) {
    if (route.startsWith(routePattern)) {
      return canView(role, module);
    }
  }

  // Allow access to root and auth routes
  if (route === "/" || route.startsWith("/auth") || route.startsWith("/api")) {
    return true;
  }

  return false;
}

// Get filter scope for data queries
export type DataScope = "all" | "company" | "department" | "self";

export function getDataScope(role: Role, module: Module): DataScope {
  if (role === "super_admin") return "all";
  if (role === "admin" || role === "hr") return "company";
  if (role === "manager") {
    // Managers can only see team data for these modules
    if (["employees", "attendance", "leave", "expenses", "resignations"].includes(module)) {
      return "department";
    }
    return "company";
  }
  return "self"; // employee
}
