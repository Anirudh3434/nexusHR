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

  // Tool: get_late_arrivals
  server.tool(
    'get_late_arrivals',
    'Count and list employees who arrived late on a given day (defaults to today). Employees see only their own record; Managers/HR/Admin see the whole company.',
    {
      date: z.string().optional().describe('Day to check as YYYY-MM-DD. Defaults to today.'),
    },
    async ({ date }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'attendance', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const parsed = date ? new Date(`${date}T00:00:00`) : new Date();
        if (isNaN(parsed.getTime())) {
          return { content: [{ type: 'text', text: `Invalid date "${date}". Use YYYY-MM-DD.` }], isError: true };
        }

        // Some records store UTC midnight, others a full timestamp — a local-day
        // window covers both (same convention as /api/attendance).
        const start = new Date(parsed);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsed);
        end.setHours(23, 59, 59, 999);

        const query: any = {
          date: { $gte: start, $lte: end },
          $or: [{ isLate: true }, { status: 'Late' }],
        };
        if (user.companyId) query.companyId = user.companyId;
        // Employees may only inspect themselves.
        if (user.role === 'employee') query.employeeId = user.id;

        const records = await Attendance.find(query)
          .populate('employeeId', 'name email department designation')
          .lean();

        const employees = records
          .map((record: any) => ({
            employee: record.employeeId?.name || record.employeeName || 'Unknown',
            department: record.employeeId?.department || record.department || '',
            designation: record.employeeId?.designation || record.designation || '',
            checkIn: record.checkIn?.time || null,
            lateMinutes: record.lateMinutes || 0,
            status: record.status || 'Late',
          }))
          .sort((a: any, b: any) => b.lateMinutes - a.lateMinutes)
          .slice(0, 100);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
                scope: user.role === 'employee' ? 'self' : 'company',
                lateCount: employees.length,
                employees,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error fetching late arrivals: ${err.message}` }], isError: true };
      }
    }
  );
}

