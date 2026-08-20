import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthInfo } from '@/lib/auth-util';
import mongoose from 'mongoose';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Company from '@/models/Company';
import WorkShift from '@/models/WorkShift';
import LinkedDevice from '@/models/LinkedDevice';
import Task from '@/models/Task';
import Project from '@/models/Project';
import Ticket from '@/models/Ticket';
import Holiday from '@/models/Holiday';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Explicitly load models to prevent MissingSchemaError during population
    require('@/models/User');
    require('@/models/Attendance');
    require('@/models/Leave');
    require('@/models/WorkShift');
    require('@/models/Company');
    require('@/models/LinkedDevice');
    require('@/models/Task');
    require('@/models/Project');
    require('@/models/Ticket');
    require('@/models/Holiday');
    
    const auth = await getAuthInfo();
    
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role: userRole, companyId } = auth;
    
    // Base stats for all roles
    const baseStats = {
      userRole,
      today: new Date().toISOString().split('T')[0],
    };

    // Role-specific stats
    switch (userRole) {
      case 'admin':
        return await getAdminStats(baseStats, companyId || null, userId);
      case 'hr':
        return await getHRStats(baseStats, companyId || null, userId);
      case 'manager':
        return await getManagerStats(baseStats, companyId || null, userId);
      case 'employee':
      default:
        return await getEmployeeStats(baseStats, companyId || null, userId);
    }
    
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dashboard stats', error: error.message },
      { status: 500 }
    );
  }
}

// Helper: Calculate upcoming birthdays with relative human text
function calculateUpcomingBirthdays(employees: any[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const results: any[] = [];

  for (const emp of employees) {
    if (!emp.dob) continue;
    const dob = new Date(emp.dob);
    if (isNaN(dob.getTime())) continue;

    // Calculate this year's birthday
    let nextBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBday < todayStart) {
      // If birthday already passed this year, take next year
      nextBday = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
    }

    const diffTime = nextBday.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Only take birthdays in the next 120 days
    if (diffDays >= 0 && diffDays <= 120) {
      let relativeText = "";
      if (diffDays === 0) relativeText = "Today";
      else if (diffDays === 1) relativeText = "Tomorrow";
      else if (diffDays < 7) relativeText = `${diffDays} days after`;
      else if (diffDays < 14) relativeText = "1 week after";
      else if (diffDays < 21) relativeText = "2 weeks after";
      else if (diffDays < 28) relativeText = "3 weeks after";
      else if (diffDays < 35) relativeText = "4 weeks after";
      else if (diffDays < 60) relativeText = "1 month after";
      else if (diffDays < 90) relativeText = "2 months after";
      else relativeText = `${Math.round(diffDays / 30)} months after`;

      const dayStr = String(dob.getDate()).padStart(2, '0');
      const monthStr = monthNames[dob.getMonth()];

      results.push({
        id: emp._id?.toString() || emp.id,
        name: emp.name,
        department: emp.department || "Engineering",
        designation: emp.designation || "Team Member",
        avatar: emp.avatar,
        formattedDate: `${dayStr} ${monthStr}`,
        relativeText,
        diffDays
      });
    }
  }

  return results.sort((a, b) => a.diffDays - b.diffDays).slice(0, 10);
}

// Helper: Common Task and Project Stats
async function getCommonTaskProjectTicketData(userId: string, companyId: string | null, userRole: string = 'employee') {
  const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  const companyObjId = companyId && mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : null;

  const now = new Date();

  // Tasks Query:
  // For employees: only tasks assigned to them
  // For admin/hr: all company tasks
  const taskQuery = (userRole === 'admin' || userRole === 'hr')
    ? (companyObjId ? { companyId: companyObjId } : {})
    : (userObjId ? { assignedTo: userObjId } : (companyObjId ? { companyId: companyObjId } : {}));

  // Projects Query:
  // For employees: only projects where they are in members or createdBy
  // For admin/hr/manager: all company projects
  const projectQuery = (userRole === 'admin' || userRole === 'hr' || userRole === 'manager')
    ? (companyObjId ? { companyId: companyObjId } : {})
    : (userObjId
        ? {
            ...(companyObjId ? { companyId: companyObjId } : {}),
            $or: [
              { 'members.employeeId': userObjId },
              { createdBy: userObjId }
            ]
          }
        : (companyObjId ? { companyId: companyObjId } : {})
      );

  const [userTasks, userProjects, userTickets, companyHolidays, weekLeaves] = await Promise.all([
    Task.find(taskQuery).sort({ dueDate: 1, createdAt: -1 }).limit(20),
    Project.find(projectQuery).limit(50),
    Ticket.find(userObjId ? { $or: [{ reportedBy: userObjId }, { assignedTo: userObjId }] } : {}).sort({ createdAt: -1 }).limit(5),
    Holiday.find({ date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } }).limit(10),
    Leave.find({
      status: 'Approved',
      endDate: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7) }
    }).populate('employeeId', 'name designation avatar').limit(10)
  ]);

  const tasksToUse = userTasks;

  const pendingTasksCount = tasksToUse.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const overdueTasksCount = tasksToUse.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now).length;

  // Projects calculations
  const inProgressProjects = userProjects.filter(p => p.status === 'active' || p.status === 'planning').length;
  const overdueProjects = userProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.endDate && new Date(p.endDate) < now).length;

  // Format tasks for table
  const formattedTasks = tasksToUse.map(t => {
    let formattedDue = "--";
    let isOverdue = false;
    if (t.dueDate) {
      const d = new Date(t.dueDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      formattedDue = `${day}-${month}-${year}`;
      isOverdue = d < now && t.status !== 'completed';
    }

    let statusDisplay = "To Do";
    if (t.status === 'in_progress') statusDisplay = "Doing";
    else if (t.status === 'in_review') statusDisplay = "In Review";
    else if (t.status === 'completed') statusDisplay = "Done";
    else if (t.status === 'backlog') statusDisplay = "Backlog";

    return {
      id: t._id.toString(),
      taskNumber: t.taskNumber ? `#${t.taskNumber}` : `#${t._id.toString().slice(-4).toUpperCase()}`,
      title: t.title,
      status: statusDisplay,
      rawStatus: t.status,
      dueDate: formattedDue,
      isOverdue
    };
  });

  // Format tickets
  const formattedTickets = userTickets.map(tk => ({
    id: tk._id.toString(),
    ticketNumber: tk.ticketNumber ? `#${tk.ticketNumber}` : `#TK-${tk._id.toString().slice(-4).toUpperCase()}`,
    subject: tk.title,
    status: tk.status,
    requestedOn: new Date(tk.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }));

  // Format calendar schedule items
  const calendarSchedule: any[] = [];
  weekLeaves.forEach(l => {
    calendarSchedule.push({
      id: l._id.toString(),
      type: 'leave',
      title: l.employeeId?.name || 'On Leave',
      employeeName: l.employeeId?.name,
      avatar: l.employeeId?.avatar,
      date: new Date(l.startDate).toISOString().split('T')[0],
      isAllDay: true
    });
  });

  companyHolidays.forEach(h => {
    calendarSchedule.push({
      id: h._id.toString(),
      type: 'holiday',
      title: h.name,
      date: new Date(h.date).toISOString().split('T')[0],
      isAllDay: true
    });
  });

  return {
    tasksSummary: {
      pending: pendingTasksCount,
      overdue: overdueTasksCount,
      open: pendingTasksCount,
      total: tasksToUse.length
    },
    projectsSummary: {
      inProgress: inProgressProjects,
      overdue: overdueProjects,
      total: userProjects.length
    },
    projects: userProjects.map(p => ({
      id: p._id.toString(),
      name: p.name,
      status: p.status,
      progressPercentage: (p as any).progressPercentage || 0,
      deadline: (p as any).endDate ? new Date((p as any).endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null,
      budget: (p as any).budget,
      currency: (p as any).currency || 'USD',
      manager: ((p.managerId as any)?.name) || 'Sunil Singh',
      memberCount: p.members?.length || 0
    })),
    myTasks: formattedTasks,
    tickets: formattedTickets,
    calendarSchedule
  };
}

async function getAdminStats(baseStats: any, companyId: string | null, userId: string) {
  const query = companyId ? { companyId } : {};
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayMonthDay = todayStr.slice(5); // MM-DD format
  
  const [
    totalEmployees,
    totalUsers,
    pendingLeaves,
    todayAttendance,
    companiesCount,
    allEmployees,
    onLeaveTodayDocs,
    commonData
  ] = await Promise.all([
    User.countDocuments({ ...query, role: 'employee', isActive: true }),
    User.countDocuments({ ...query, isActive: true }),
    Leave.countDocuments({ ...query, status: 'Pending' }),
    Attendance.countDocuments({ 
      ...query, 
      date: todayStr, 
      status: { $in: ['Present', 'Late', 'Half Day'] } 
    }),
    Company.countDocuments({}),
    User.find({ ...query, isActive: true }).select('name dob department designation avatar employeeId joiningDate'),
    Leave.find({
      ...query,
      status: 'Approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate('employeeId', 'name department designation avatar employeeId'),
    getCommonTaskProjectTicketData(userId, companyId, 'admin')
  ]);

  const upcomingBirthdays = calculateUpcomingBirthdays(allEmployees);

  // Today's Joinings
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  const joiningToday = allEmployees.filter(emp => {
    if (!emp.joiningDate) return false;
    const jDate = new Date(emp.joiningDate);
    return jDate >= todayStart && jDate <= todayEnd;
  });

  // Work Anniversaries
  const anniversaries = allEmployees.filter(emp => {
    if (!emp.joiningDate) return false;
    const joinStr = new Date(emp.joiningDate).toISOString().slice(5, 10);
    const years = today.getFullYear() - new Date(emp.joiningDate).getFullYear();
    return joinStr === todayMonthDay && years > 0;
  }).map(emp => ({
    ...emp.toObject(),
    years: today.getFullYear() - new Date(emp.joiningDate!).getFullYear()
  }));

  // Personal attendance record for admin
  const [adminUser, adminDevice, todayRecord] = await Promise.all([
    User.findById(userId).populate('workShiftId', 'name startTime endTime'),
    LinkedDevice.findOne({ userId, isActive: true })
      .select('deviceName platform lastActive model batteryLevel batteryState networkType'),
    Attendance.findOne({ employeeId: userId, date: todayStr })
  ]);

  const shiftInfo = adminUser?.workShiftId as any;

  return NextResponse.json({
    ...baseStats,
    employee: {
      id: adminUser?._id?.toString(),
      name: adminUser?.name,
      department: adminUser?.department || 'Administration',
      designation: adminUser?.designation || 'Administrator',
      employeeId: adminUser?.employeeId || '001',
      avatar: adminUser?.avatar,
      joiningDate: adminUser?.joiningDate,
      openTasks: commonData.tasksSummary.open,
      totalProjects: commonData.projectsSummary.inProgress,
      shift: shiftInfo ? {
        name: shiftInfo.name,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime
      } : null,
      linkedDevice: adminDevice ? {
        deviceName: adminDevice.deviceName,
        platform: adminDevice.platform,
        model: adminDevice.model,
        lastActive: adminDevice.lastActive,
        batteryLevel: adminDevice.batteryLevel,
        batteryState: adminDevice.batteryState,
        networkType: adminDevice.networkType,
      } : null,
    },
    overview: {
      totalEmployees,
      totalUsers,
      pendingLeaves,
      todayPresent: todayAttendance,
      attendanceRate: totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0,
      todayStatus: todayRecord?.checkOut ? 'Checked Out' : (todayRecord?.status || 'Not Checked In'),
      checkInTime: typeof todayRecord?.checkIn === 'object' ? todayRecord.checkIn.time : todayRecord?.checkIn || null,
      checkOutTime: typeof todayRecord?.checkOut === 'object' && todayRecord?.checkOut?.time ? todayRecord.checkOut.time : null
    },
    widgets: {
      birthdays: upcomingBirthdays,
      onLeave: onLeaveTodayDocs.map(l => ({
        id: l._id.toString(),
        name: l.employeeId?.name || 'Colleague',
        department: l.employeeId?.department,
        designation: l.employeeId?.designation || 'Software Developer',
        avatar: l.employeeId?.avatar,
        leaveType: l.leaveType || 'Leave',
        duration: 'Full Day'
      })),
      joiningToday: joiningToday.map(e => ({
        id: e._id.toString(),
        name: e.name,
        department: e.department,
        designation: e.designation,
        avatar: e.avatar,
        joiningDate: e.joiningDate,
      })),
      anniversaries: anniversaries.map(e => ({
        id: e._id.toString(),
        name: e.name,
        department: e.department,
        designation: e.designation,
        avatar: e.avatar,
        years: e.years,
      })),
      tasksSummary: commonData.tasksSummary,
      projectsSummary: commonData.projectsSummary,
      myTasks: commonData.myTasks,
      tickets: commonData.tickets,
      calendarSchedule: commonData.calendarSchedule
    }
  });
}

async function getHRStats(baseStats: any, companyId: string | null, userId: string) {
  return await getAdminStats(baseStats, companyId, userId);
}

async function getManagerStats(baseStats: any, companyId: string | null, userId: string) {
  return await getAdminStats(baseStats, companyId, userId);
}

async function getEmployeeStats(baseStats: any, companyId: string | null, userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const query = companyId ? { companyId } : {};
  const todayMonthDay = todayStr.slice(5);

  const [
    employee,
    linkedDevice,
    allEmployees,
    onLeaveTodayDocs,
    todayRecord,
    commonData
  ] = await Promise.all([
    User.findById(userId)
      .select('name department designation employeeId joiningDate workShiftId companyId avatar')
      .populate('workShiftId', 'name startTime endTime'),
    LinkedDevice.findOne({ userId, isActive: true })
      .select('deviceName platform lastActive model batteryLevel batteryState networkType'),
    User.find({ ...query, isActive: true }).select('name dob department designation avatar employeeId joiningDate'),
    Leave.find({
      ...query,
      status: 'Approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate('employeeId', 'name department designation avatar employeeId'),
    Attendance.findOne({ employeeId: userId, date: todayStr }),
    getCommonTaskProjectTicketData(userId, companyId, 'employee')
  ]);

  const upcomingBirthdays = calculateUpcomingBirthdays(allEmployees);

  // Today's Joinings
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  const joiningToday = allEmployees.filter(emp => {
    if (!emp.joiningDate) return false;
    const jDate = new Date(emp.joiningDate);
    return jDate >= todayStart && jDate <= todayEnd;
  });

  // Work Anniversaries
  const anniversaries = allEmployees.filter(emp => {
    if (!emp.joiningDate) return false;
    const joinStr = new Date(emp.joiningDate).toISOString().slice(5, 10);
    const years = today.getFullYear() - new Date(emp.joiningDate).getFullYear();
    return joinStr === todayMonthDay && years > 0;
  }).map(emp => ({
    ...emp.toObject(),
    years: today.getFullYear() - new Date(emp.joiningDate!).getFullYear()
  }));

  const shiftInfo = employee?.workShiftId as any;

  return NextResponse.json({
    ...baseStats,
    employee: {
      id: employee?._id?.toString(),
      name: employee?.name,
      department: employee?.department || 'Engineering',
      designation: employee?.designation || 'Software Developer',
      employeeId: employee?.employeeId || '025',
      avatar: employee?.avatar,
      joiningDate: employee?.joiningDate,
      openTasks: commonData.tasksSummary.open,
      totalProjects: commonData.projectsSummary.inProgress,
      shift: shiftInfo ? {
        name: shiftInfo.name,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime
      } : null,
      linkedDevice: linkedDevice ? {
        deviceName: linkedDevice.deviceName,
        platform: linkedDevice.platform,
        model: linkedDevice.model,
        lastActive: linkedDevice.lastActive,
        batteryLevel: linkedDevice.batteryLevel,
        batteryState: linkedDevice.batteryState,
        networkType: linkedDevice.networkType,
      } : null,
    },
    overview: {
      todayStatus: todayRecord?.checkOut ? 'Checked Out' : (todayRecord?.status || 'Not Checked In'),
      checkInTime: typeof todayRecord?.checkIn === 'object' ? todayRecord.checkIn.time : todayRecord?.checkIn || null,
      checkOutTime: typeof todayRecord?.checkOut === 'object' && todayRecord?.checkOut?.time ? todayRecord.checkOut.time : null
    },
    widgets: {
      birthdays: upcomingBirthdays,
      onLeave: onLeaveTodayDocs.map(l => ({
        id: l._id.toString(),
        name: l.employeeId?.name || 'Colleague',
        department: l.employeeId?.department,
        designation: l.employeeId?.designation || 'Software Developer',
        avatar: l.employeeId?.avatar,
        leaveType: l.leaveType || 'Leave',
        duration: 'Full Day'
      })),
      joiningToday: joiningToday.map(e => ({
        id: e._id.toString(),
        name: e.name,
        department: e.department,
        designation: e.designation,
        avatar: e.avatar,
        joiningDate: e.joiningDate,
      })),
      anniversaries: anniversaries.map(e => ({
        id: e._id.toString(),
        name: e.name,
        department: e.department,
        designation: e.designation,
        avatar: e.avatar,
        years: e.years,
      })),
      tasksSummary: commonData.tasksSummary,
      projectsSummary: commonData.projectsSummary,
      myTasks: commonData.myTasks,
      tickets: commonData.tickets,
      calendarSchedule: commonData.calendarSchedule
    }
  });
}
