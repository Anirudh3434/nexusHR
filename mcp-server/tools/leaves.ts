import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveUserContext, checkPermission } from '../auth';
import Leave from '../../models/Leave';

export function registerLeaveTools(server: McpServer) {
  // Tool: get_leaves
  server.tool(
    'get_leaves',
    'Get leave requests. Regular employees only see their own leaves; Managers/HR/Admin can view team/company leaves.',
    {
      status: z.enum(['Pending', 'Approved', 'Rejected', 'all']).default('all').describe('Filter by leave status'),
      limit: z.number().default(20).describe('Limit results'),
    },
    async ({ status, limit }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'leave', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const query: any = {};
        if (user.companyId) query.companyId = user.companyId;

        // Employees only see their own leaves
        if (user.role === 'employee') {
          query.employeeId = user.id;
        }

        if (status !== 'all') {
          query.status = status;
        }

        const leaves = await Leave.find(query)
          .populate('employeeId', 'name email department')
          .populate('approvedBy', 'name email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: leaves.length, leaves }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error fetching leaves: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: apply_leave
  server.tool(
    'apply_leave',
    'Submit a leave application for yourself.',
    {
      type: z.enum(['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other']).describe('Leave category'),
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().describe('End date (YYYY-MM-DD)'),
      reason: z.string().describe('Reason for taking leave'),
    },
    async ({ type, startDate, endDate, reason }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'leave', 'create');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          return { content: [{ type: 'text', text: 'Invalid date range: End date must be on or after start date.' }], isError: true };
        }

        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newLeave = await Leave.create({
          employeeId: user.id,
          companyId: user.companyId,
          type,
          startDate: start,
          endDate: end,
          totalDays: diffDays,
          reason,
          status: 'Pending',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Leave application submitted successfully (${diffDays} days). Status: Pending approval.`,
                leaveId: newLeave._id.toString(),
                type: newLeave.type,
                startDate,
                endDate,
                totalDays: diffDays,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error applying for leave: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: approve_or_reject_leave
  server.tool(
    'approve_or_reject_leave',
    'Approve or reject a pending leave application. Strictly requires "approve" permission (Manager, HR, Admin only).',
    {
      leaveId: z.string().describe('The Leave ObjectId'),
      action: z.enum(['Approve', 'Reject']).describe('Decision action'),
      rejectionReason: z.string().optional().describe('Reason if rejecting'),
    },
    async ({ leaveId, action, rejectionReason }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'leave', 'approve');
        if (!check.allowed) {
          return {
            content: [{
              type: 'text',
              text: `Permission Denied: User "${user.name}" with role "${user.role}" is not authorized to approve or reject leaves.`,
            }],
            isError: true,
          };
        }

        const leave = await Leave.findById(leaveId);
        if (!leave) {
          return { content: [{ type: 'text', text: `Leave record ${leaveId} not found.` }], isError: true };
        }

        if (action === 'Approve') {
          leave.status = 'Approved';
          leave.approvedBy = user.id as any;
          leave.approvedAt = new Date();
        } else {
          leave.status = 'Rejected';
          leave.rejectionReason = rejectionReason || 'Rejected by approver';
        }

        await leave.save({ validateModifiedOnly: true });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Leave application ${action === 'Approve' ? 'approved' : 'rejected'} successfully by ${user.name}.`,
                leaveId: leave._id.toString(),
                status: leave.status,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error updating leave decision: ${err.message}` }], isError: true };
      }
    }
  );
}

