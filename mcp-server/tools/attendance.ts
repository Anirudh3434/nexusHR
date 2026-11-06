import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveUserContext, checkPermission } from '../auth';
import Attendance from '../../models/Attendance';

export function registerAttendanceTools(server: McpServer) {
  // Tool: clock_in
  server.tool(
    'clock_in',
    'Clock in for today.',
    {
      notes: z.string().optional().describe('Optional note or work location description'),
    },
    async ({ notes }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'attendance', 'create');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const now = new Date();
        const todayStr = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let record = await Attendance.findOne({ employeeId: user.id, date: todayStr });
        if (record && record.checkIn?.time) {
          return {
            content: [{
              type: 'text',
              text: `Already clocked in today at ${record.checkIn.time}. Status: ${record.status || 'Present'}.`,
            }],
          };
        }

        if (!record) {
          record = new Attendance({
            employeeId: user.id,
            companyId: user.companyId,
            date: todayStr,
            checkIn: { time: timeStr },
            status: 'Present',
          });
        } else {
          record.checkIn = { time: timeStr };
          record.status = record.status || 'Present';
        }

        await record.save({ validateModifiedOnly: true });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Clock-in successful at ${timeStr}.`,
                employee: user.name,
                date: todayStr.toISOString().split('T')[0],
                time: timeStr,
                status: record.status,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error clocking in: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: clock_out
  server.tool(
    'clock_out',
    'Clock out for today.',
    {},
    async () => {
      try {
        const user = await resolveUserContext();
        const now = new Date();
        const todayStr = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const record = await Attendance.findOne({ employeeId: user.id, date: todayStr });
        if (!record || !record.checkIn?.time) {
          return {
            content: [{ type: 'text', text: 'Cannot clock out: You have not clocked in yet today.' }],
            isError: true,
          };
        }

        record.checkOut = { time: timeStr };
        await record.save({ validateModifiedOnly: true });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Clock-out recorded at ${timeStr}.`,
                employee: user.name,
                checkIn: record.checkIn.time,
                checkOut: timeStr,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error clocking out: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: get_attendance_records
  server.tool(
    'get_attendance_records',
    'Fetch attendance logs. Employees can only see their own attendance; Managers/HR/Admin can query team attendance.',
    {
      employeeId: z.string().optional().describe('Filter by specific employee (Managers/HR/Admin only)'),
      limit: z.number().default(14).describe('Days to retrieve (default 14)'),
    },
    async ({ employeeId, limit }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'attendance', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const query: any = {};
        if (user.companyId) query.companyId = user.companyId;

        // Employees are strictly restricted to their own ID
        if (user.role === 'employee' || !employeeId) {
          query.employeeId = user.id;
        } else {
          query.employeeId = employeeId;
        }

        const records = await Attendance.find(query)
          .populate('employeeId', 'name email department')
          .sort({ date: -1 })
          .limit(limit)
          .lean();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: records.length, records }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error fetching attendance: ${err.message}` }], isError: true };
      }
    }
  );
}

