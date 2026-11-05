import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveUserContext, checkPermission } from '../auth';
import Notice from '../../models/Notice';

export function registerNoticeTools(server: McpServer) {
  // Tool: get_notices
  server.tool(
    'get_notices',
    'Get active company notices and announcements.',
    {
      limit: z.number().default(10).describe('Limit results'),
    },
    async ({ limit }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'notices', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const now = new Date();
        const query: any = {
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: { $gte: now } },
          ],
        };
        if (user.companyId) query.companyId = user.companyId;

        const notices = await Notice.find(query)
          .populate('postedBy', 'name role')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: notices.length, notices }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error fetching notices: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: post_notice
  server.tool(
    'post_notice',
    'Post a new company notice or announcement. Restricted to HR and Admin roles.',
    {
      title: z.string().describe('Notice title'),
      content: z.string().describe('Notice body content'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Priority level'),
      department: z.string().optional().describe('Specific department target or all'),
      expiryDate: z.string().optional().describe('Expiry date (YYYY-MM-DD)'),
    },
    async ({ title, content, priority, department, expiryDate }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'notices', 'create');
        if (!check.allowed) {
          return {
            content: [{
              type: 'text',
              text: `Permission Denied: User "${user.name}" (${user.role}) is not authorized to create company notices.`,
            }],
            isError: true,
          };
        }

        const notice = await Notice.create({
          title,
          content,
          priority,
          targetDepartment: department || 'all',
          postedBy: user.id,
          companyId: user.companyId,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Notice posted successfully',
                notice: {
                  id: notice._id.toString(),
                  title: notice.title,
                  priority: notice.priority,
                  postedBy: user.name,
                },
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error posting notice: ${err.message}` }], isError: true };
      }
    }
  );
}

