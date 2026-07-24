# Role-Based Access Control Documentation

## Quick Start

### 1. Check Permissions in API Routes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { apiGuard, getUserFromRequest, buildDataQuery } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  // Check if user can view employees
  const guard = apiGuard(req, "employees", "view");
  if (!guard.authorized) {
    return guard.response; // Returns 401 or 403
  }
  
  const { user } = guard;
  
  // Build filtered query based on role
  const query = buildDataQuery(user, {}, {
    companyField: "companyId",
    ownerField: "employeeId", // For employee role
    departmentField: "department", // For manager role
  });
  
  const data = await Employee.find(query);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // Check if user can create
  const guard = apiGuard(req, "employees", "create");
  if (!guard.authorized) {
    return guard.response;
  }
  
  const { user } = guard;
  // Only admin/HR can create in their company
  // ... create logic
}

export async function DELETE(req: NextRequest) {
  // Only admin can delete
  const guard = apiGuard(req, "employees", "delete");
  if (!guard.authorized) {
    return guard.response;
  }
  
  // ... delete logic
}
```

### 2. Protect UI Components

```tsx
import { CanCreate, CanEdit, CanDelete, CanApprove } from "@/components/permissions/PermissionGuard";
import { ManagerAndAbove } from "@/components/permissions/PermissionGuard";

export default function EmployeesPage() {
  return (
    <div>
      <h1>Employees</h1>
      
      {/* Only show Add button if user has create permission */}
      <CanCreate module="employees">
        <Button>Add Employee</Button>
      </CanCreate>
      
      <EmployeeTable>
        {employees.map(emp => (
          <tr key={emp.id}>
            <td>{emp.name}</td>
            <td>
              {/* Show edit only if user can edit employees */}
              <CanEdit module="employees">
                <Button variant="ghost">Edit</Button>
              </CanEdit>
              
              {/* Show delete only if user can delete */}
              <CanDelete module="employees">
                <Button variant="destructive">Delete</Button>
              </CanDelete>
            </td>
          </tr>
        ))}
      </EmployeeTable>
    </div>
  );
}
```

### 3. Use Permission Hook

```tsx
import { usePermissions } from "@/hooks/usePermissions";

export function EmployeeCard({ employee }: { employee: Employee }) {
  const { canEdit, canDelete, canManageResource, role } = usePermissions();
  
  // Check specific permission
  const canEditThis = canEdit("employees");
  
  // Check ownership-based permission
  const canManageThis = canManageResource(
    "employees", 
    "edit", 
    employee.id, // owner
    employee.department
  );
  
  return (
    <Card>
      <CardContent>
        <h3>{employee.name}</h3>
        {canManageThis && <Button>Edit</Button>}
      </CardContent>
    </Card>
  );
}
```

### 4. Route Protection (Already Done in Middleware)

Routes are automatically protected by `middleware.ts`:
- Employees without permission are redirected to `/dashboard`
- Unauthorized API requests return 403

## Permission Matrix

| Module | Super Admin | Admin | HR | Manager | Employee |
|--------|-------------|-------|-----|---------|----------|
| dashboard | view | view | view | view | view |
| employees | CRUD | CRUD | view/edit | view (team) | view (self) |
| recruitment | CRUD | CRUD | CRUD | view | - |
| attendance | CRUD | CRUD | manage | view (team) | view/create (self) |
| leave | CRUD+approve | CRUD+approve | view+approve | approve (team) | view+create (self) |
| payroll | CRUD | CRUD | view | - | view (own) |
| expenses | CRUD+approve | CRUD+approve | approve | approve (team) | view+create (self) |
| tickets | CRUD | CRUD | manage | view | view+create (self) |
| departments | CRUD | CRUD | view | - | - |
| settings | CRUD | manage | - | - | - |

**Legend:** CRUD = Create, Read, Update, Delete

## Available Components

### PermissionGuard Components
- `<CanView module="employees">` - Only renders if user can view
- `<CanCreate module="employees">` - Only renders if user can create
- `<CanEdit module="employees">` - Only renders if user can edit
- `<CanDelete module="employees">` - Only renders if user can delete
- `<CanApprove module="leave">` - Only renders if user can approve

### RoleGuard Components
- `<AdminOnly>` - Only super_admin and admin
- `<HRAndAbove>` - super_admin, admin, hr
- `<ManagerAndAbove>` - super_admin, admin, hr, manager
- `<RoleGuard allowedRoles={["admin", "hr"]}>` - Custom role list

### ResourceGuard
- `<ResourceGuard module="employees" action="edit" resourceOwnerId={userId}>`

## Utility Functions

### hasPermission(role, module, permission)
```typescript
import { hasPermission } from "@/lib/permissions";

const canEdit = hasPermission("hr", "employees", "edit"); // true
```

### getDataScope(role, module)
```typescript
import { getDataScope } from "@/lib/permissions";

const scope = getDataScope("manager", "employees"); // "department"
const scope = getDataScope("employee", "employees"); // "self"
```

## API Route Examples

### Full Protected Route
```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { apiGuard, buildDataQuery, getUserFromRequest, canAccessResource } from "@/lib/api-guard";
import Employee from "@/models/Employee";

// GET - List employees (filtered by role)
export async function GET(req: NextRequest) {
  const guard = apiGuard(req, "employees", "view");
  if (!guard.authorized) return guard.response;
  
  const { user } = guard;
  const query = buildDataQuery(user, {}, {
    ownerField: "_id",
    departmentField: "department",
  });
  
  const employees = await Employee.find(query).select("-password");
  return NextResponse.json({ employees });
}

// POST - Create employee
export async function POST(req: NextRequest) {
  const guard = apiGuard(req, "employees", "create");
  if (!guard.authorized) return guard.response;
  
  const { user } = guard;
  const body = await req.json();
  
  // Force companyId to user's company
  body.companyId = user.companyId;
  
  const employee = await Employee.create(body);
  return NextResponse.json({ employee }, { status: 201 });
}

// PATCH - Update employee
export async function PATCH(req: NextRequest) {
  const guard = apiGuard(req, "employees", "edit");
  if (!guard.authorized) return guard.response;
  
  const { user } = guard;
  const { id, ...updates } = await req.json();
  
  // Check if user can access this specific resource
  const existing = await Employee.findById(id);
  if (!existing) return notFoundResponse();
  
  if (!canAccessResource(user, {
    companyId: existing.companyId?.toString(),
    ownerId: existing._id.toString(),
    department: existing.department,
  })) {
    return forbiddenResponse("Cannot access this employee");
  }
  
  const updated = await Employee.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json({ employee: updated });
}
```
