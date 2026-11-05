import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveUserContext, checkPermission } from '../auth';
import { getAccessibleModules, Module, Permission, hasPermission } from '../../lib/permissions';

export function registerProfileTools(server: McpServer) {
  // Tool: get_current_user_profile
  server.tool(
    'get_current_user_profile',
    'Get profile and permissions for the currently authenticated user in NexusHR.',
    {},
    async () => {
      try {
        const user = await resolveUserContext();
        const accessibleModules = getAccessibleModules(user.role);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  department: user.department || 'N/A',
                  designation: user.designation || 'N/A',
                  companyId: user.companyId || 'N/A',
                },
                accessibleModules,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error fetching profile: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: check_permission
  server.tool(
    'check_permission',
    'Check if the current user has permission to perform an action on an HRM module.',
    {
      module: z.string().describe('The module name (e.g., tasks, leave, attendance, employees, payroll)'),
      permission: z.enum(['view', 'create', 'edit', 'delete', 'approve', 'manage']).describe('The permission to check'),
    },
    async ({ module, permission }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, module as Module, permission as Permission);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                user: user.name,
                role: user.role,
                module,
                permission,
                isAllowed: check.allowed,
                message: check.allowed
                  ? `Access Granted: ${user.name} (${user.role}) has "${permission}" access to "${module}".`
                  : check.error,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error checking permission: ${err.message}` }],
          isError: true,
        };
      }
    }
  );
}

