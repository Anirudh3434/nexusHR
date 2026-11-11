import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveUserContext, checkPermission } from '../auth';
import Leave from '../../models/Leave';
import LeaveType from '../../models/LeaveType';

export function registerLeaveTools(server: McpServer) {
  // Tool: get_leave_balances
  server.tool(
    'get_leave_balances',
    'Get real-time leave balances and PTO (Paid Time Off) remaining for the calling employee, including Annual/PTO, Sick, and Casual leave allocations, used days, and pending approval days.',
    {
      year: z.number().optional().describe('Calendar year (defaults to current year)'),
    },
    async ({ year }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'leave', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const targetYear = year || new Date().getFullYear();
        const startOfYear = new Date(targetYear, 0, 1);
        const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

        // Fetch user's leaves for the target year
        const query: any = {
          employeeId: user.id,
          startDate: { $gte: startOfYear, $lte: endOfYear },
        };
        if (user.companyId) query.companyId = user.companyId;

        const leaves = await Leave.find(query).lean();

        // Calculate used and pending days by leave type
        const usedByType: Record<string, number> = {};
        const pendingByType: Record<string, number> = {};

        leaves.forEach((l: any) => {
          const typeKey = (l.type || 'other').toLowerCase();
          const days = Number(l.totalDays) || 1;
          if (l.status === 'Approved') {
            usedByType[typeKey] = (usedByType[typeKey] || 0) + days;
          } else if (l.status === 'Pending') {
            pendingByType[typeKey] = (pendingByType[typeKey] || 0) + days;
          }
        });

        // Check configured leave types for this company if available
        let companyLeaveTypes: any[] = [];
        try {
          if (user.companyId) {
            companyLeaveTypes = await LeaveType.find({
              companyId: user.companyId,
              isActive: true,
            }).lean();
          }
        } catch {
          // fallback to defaults if query fails
        }

        // Standard allocations (matching NexusHR portal defaults: Annual: 24, Sick: 12, Casual: 8)
        const annualConfig = companyLeaveTypes.find((t: any) => /annual|paid|pto/i.test(t.name) || /pl|al|pto/i.test(t.code));
        const sickConfig = companyLeaveTypes.find((t: any) => /sick/i.test(t.name) || /sl/i.test(t.code));
        const casualConfig = companyLeaveTypes.find((t: any) => /casual/i.test(t.name) || /cl/i.test(t.code));

        const annualTotal = annualConfig?.defaultDays ?? 24;
        const sickTotal = sickConfig?.defaultDays ?? 12;
        const casualTotal = casualConfig?.defaultDays ?? 8;

        const annualUsed = (usedByType['annual'] || 0) + (usedByType['paid'] || 0) + (usedByType['pto'] || 0);
        const sickUsed = usedByType['sick'] || 0;
        const casualUsed = usedByType['casual'] || 0;

        const annualPending = (pendingByType['annual'] || 0) + (pendingByType['paid'] || 0) + (pendingByType['pto'] || 0);
        const sickPending = pendingByType['sick'] || 0;
        const casualPending = pendingByType['casual'] || 0;

        const balances = {
          annual_pto: {
            name: 'Annual / Paid Time Off (PTO)',
            totalAllocated: annualTotal,
            usedDays: annualUsed,
            remainingDays: Math.max(0, annualTotal - annualUsed),
            pendingDays: annualPending,
          },
          sick: {
            name: 'Sick Leave',
            totalAllocated: sickTotal,
            usedDays: sickUsed,
            remainingDays: Math.max(0, sickTotal - sickUsed),
            pendingDays: sickPending,
          },
          casual: {
            name: 'Casual Leave',
            totalAllocated: casualTotal,
            usedDays: casualUsed,
            remainingDays: Math.max(0, casualTotal - casualUsed),
            pendingDays: casualPending,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  employeeName: user.name,
                  calendarYear: targetYear,
                  ptoRemaining: balances.annual_pto.remainingDays,
                  balances,
                  totalRequestsThisYear: leaves.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error fetching leave balances: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: get_leaves
  server.tool(
    'get_leaves',
    'Get past leave requests history. (Note: To check remaining leave balances or PTO days, call get_leave_balances instead).',
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
      rejectionReason: z.string().nullish().describe('Reason if rejecting'),
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

