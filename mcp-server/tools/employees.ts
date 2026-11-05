import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveUserContext, checkPermission } from '../auth';
import User from '../../models/User';
import Department from '../../models/Department';

export function registerEmployeeTools(server: McpServer) {
  // Tool: search_employees
  server.tool(
    'search_employees',
    'Search the company employee directory by name, department, or designation. Sensitive data (salary, password) is automatically masked for non-HR/Admin users.',
    {
      query: z.string().optional().describe('Search query matching name, department, or designation'),
      department: z.string().optional().describe('Filter by department name'),
      limit: z.number().default(20).describe('Limit results'),
    },
    async ({ query, department, limit }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'employees', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const filter: any = { isActive: true };
        if (user.companyId) filter.companyId = user.companyId;

        if (department) filter.department = department;

        if (query) {
          filter.$or = [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { department: { $regex: query, $options: 'i' } },
            { designation: { $regex: query, $options: 'i' } },
          ];
        }

        const canSeeSalary = ['admin', 'hr', 'super_admin'].includes(user.role);
        const projection = canSeeSalary
          ? 'name email role department designation phone joiningDate status salary employeeId avatar'
          : 'name email role department designation employeeId avatar';

        const employees = await User.find(filter)
          .select(projection)
          .sort({ name: 1 })
          .limit(limit)
          .lean();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: employees.length, employees }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error searching employees: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: get_departments
  server.tool(
    'get_departments',
    'List all active departments in the organization.',
    {},
    async () => {
      try {
        const user = await resolveUserContext();
        const filter: any = { isActive: true };
        if (user.companyId) filter.companyId = user.companyId;

        const departments = await Department.find(filter).sort({ name: 1 }).lean();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(departments, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error fetching departments: ${err.message}` }], isError: true };
      }
    }
  );
}

