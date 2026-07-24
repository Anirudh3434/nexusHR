import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthInfo } from '@/lib/auth-util';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Company from '@/models/Company';
import WorkShift from '@/models/WorkShift';
import LinkedDevice from '@/models/LinkedDevice';

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
    
    const auth = await getAuthInfo();
    
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role: userRole, companyId } = auth;

    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
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
    companiesCount
  ] = await Promise.all([
    User.countDocuments({ ...query, role: 'employee', isActive: true }),
    User.countDocuments({ ...query, isActive: true }),
    Leave.countDocuments({ ...query, status: 'Pending' }),
    Attendance.countDocuments({ 
      ...query, 
      date: todayStr,
      status: 'Present'
    }),
    Company.countDocuments({ isActive: true })
  ]);

  // Get recent activity
  const recentLeaves = await Leave.find({ ...query })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('employeeId', 'name');

  const recentEmployees = await User.find({ ...query, role: 'employee' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email department createdAt');

  // === NEW DASHBOARD WIDGETS ===
  
  // 1. Late Coming Employees (check-in after 10:00 AM)
  const lateComersToday = await Attendance.find({
    ...query,
    date: todayStr,
    status: 'Present',
    checkIn: { $gt: '10:00' }
  }).populate('employeeId', 'name department designation avatar checkIn');

  // 2. Today's Birthdays (match MM-DD on dob)
  const allEmployees = await User.find({ ...query, isActive: true, dob: { $exists: true } })
    .select('name dob department designation avatar');
  
  const todaysBirthdays = allEmployees.filter(emp => {
    if (!emp.dob) return false;
    const dobStr = new Date(emp.dob).toISOString().slice(5, 10); // MM-DD
    return dobStr === todayMonthDay;
  });

  // 3. On Leave Today
  const onLeaveToday = await Leave.find({
    ...query,
    status: 'Approved',
    startDate: { $lte: today },
    endDate: { $gte: today }
  }).populate('employeeId', 'name department designation avatar');

  // 4. Work From Home Today
  const workFromHomeToday = await Attendance.find({
    ...query,
    date: todayStr,
    status: 'Present',
    workMode: 'wfh'
  }).populate('employeeId', 'name department designation avatar');

  // 5. Today's Joining (New employees)
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  const joiningToday = await User.find({
    ...query,
    role: 'employee',
    joiningDate: { $gte: todayStart, $lte: todayEnd }
  }).select('name department designation avatar joiningDate');

  // 6. Work Anniversaries (joining date MM-DD matches today, years > 0)
  const anniversaries = allEmployees.filter(emp => {
    if (!emp.joiningDate) return false;
    const joinStr = new Date(emp.joiningDate).toISOString().slice(5, 10);
    const years = today.getFullYear() - new Date(emp.joiningDate).getFullYear();
    return joinStr === todayMonthDay && years > 0;
  }).map(emp => ({
    ...emp.toObject(),
    years: today.getFullYear() - new Date(emp.joiningDate!).getFullYear()
  }));

  // Get personal attendance record for today
  const [adminUser, adminDevice, todayRecord] = await Promise.all([
    User.findById(userId).populate('workShiftId', 'name startTime endTime'),
    LinkedDevice.findOne({ userId, isActive: true })
      .select('deviceName platform lastActive model batteryLevel batteryState networkType'),
    Attendance.findOne({ employeeId: userId, date: todayStr })
  ]);

  console.log('[Dashboard Stats] Admin attendance record:', {
    userId,
    todayStr,
    hasRecord: !!todayRecord,
    checkOut: todayRecord?.checkOut,
    checkOutType: typeof todayRecord?.checkOut,
    checkOutTime: todayRecord?.checkOut?.time,
    status: todayRecord?.status
  });

  const shiftInfo = adminUser?.workShiftId as any;

  return NextResponse.json({
    ...baseStats,
    employee: {
      name: adminUser?.name,
      department: adminUser?.department,
      joiningDate: adminUser?.joiningDate,
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
      pendingApprovals: pendingLeaves,
      companiesCount,
      attendanceRate: totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0,
      todayStatus: todayRecord?.checkOut ? 'Checked Out' : (todayRecord?.status || 'Not Checked In'),
      checkInTime: typeof todayRecord?.checkIn === 'object' ? todayRecord.checkIn.time : todayRecord?.checkIn || null,
      checkOutTime: typeof todayRecord?.checkOut === 'object' && todayRecord?.checkOut?.time ? todayRecord.checkOut.time : null
    },
    // Dashboard widgets
    widgets: {
      lateComers: lateComersToday.map(a => ({
        id: a.employeeId?._id?.toString(),
        name: a.employeeId?.name || 'Unknown',
        department: a.employeeId?.department,
        designation: a.employeeId?.designation,
        avatar: a.employeeId?.avatar,
        checkIn: typeof a.checkIn === 'object' ? a.checkIn.time : a.checkIn,
      })),
      birthdays: todaysBirthdays.map(e => ({
        id: e._id.toString(),
        name: e.name,
        department: e.department,
        designation: e.designation,
        avatar: e.avatar,
      })),
      onLeave: onLeaveToday.map(l => ({
        id: l._id.toString(),
        employeeId: l.employeeId?._id?.toString(),
        name: l.employeeId?.name || 'Unknown',
        department: l.employeeId?.department,
        designation: l.employeeId?.designation,
        avatar: l.employeeId?.avatar,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
      workFromHome: workFromHomeToday.map(a => ({
        id: a.employeeId?._id?.toString(),
        name: a.employeeId?.name || 'Unknown',
        department: a.employeeId?.department,
        designation: a.employeeId?.designation,
        avatar: a.employeeId?.avatar,
        checkIn: typeof a.checkIn === 'object' ? a.checkIn.time : a.checkIn,
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
        joiningDate: e.joiningDate,
      })),
    },
    recentActivity: {
      recentLeaves: recentLeaves.map(l => ({
        id: l._id.toString(),
        employeeName: l.employeeId?.name || 'Unknown',
        type: l.leaveType,
        status: l.status,
        days: l.totalDays,
        createdAt: l.createdAt
      })),
      recentEmployees: recentEmployees.map(e => ({
        id: e._id.toString(),
        name: e.name,
        email: e.email,
        department: e.department,
        joinedAt: e.createdAt
      }))
    }
  });
}

async function getHRStats(baseStats: any, companyId: string | null, userId: string) {
  const query = companyId ? { companyId } : {};
  
  const [
    totalEmployees,
    pendingLeaves,
    todayAttendance,
    onLeaveToday,
    upcomingBirthdays
  ] = await Promise.all([
    User.countDocuments({ ...query, role: 'employee', isActive: true }),
    Leave.countDocuments({ ...query, status: 'Pending' }),
    Attendance.countDocuments({ 
      ...query, 
      date: new Date().toISOString().split('T')[0],
      status: 'Present'
    }),
    Leave.countDocuments({
      ...query,
      status: 'Approved',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }),
    0 // Placeholder for upcoming birthdays
  ]);

  // Get pending leave requests with details
  const leaveRequests = await Leave.find({ ...query, status: 'Pending' })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('employeeId', 'name department avatar');

  // Get attendance trends (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const attendanceTrend = await Promise.all(
    last7Days.map(async (date) => {
      const count = await Attendance.countDocuments({ ...query, date, status: 'Present' });
      return { date, count };
    })
  );

  // Get personal attendance record for today
  const [hrUser, hrDevice, todayRecord] = await Promise.all([
    User.findById(userId).populate('workShiftId', 'name startTime endTime'),
    LinkedDevice.findOne({ userId, isActive: true })
      .select('deviceName platform lastActive model batteryLevel batteryState networkType'),
    Attendance.findOne({ employeeId: userId, date: new Date().toISOString().split('T')[0] })
  ]);

  const shiftInfo = hrUser?.workShiftId as any;

  return NextResponse.json({
    ...baseStats,
    employee: {
      name: hrUser?.name,
      department: hrUser?.department,
      joiningDate: hrUser?.joiningDate,
      shift: shiftInfo ? {
        name: shiftInfo.name,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime
      } : null,
      linkedDevice: hrDevice ? {
        deviceName: hrDevice.deviceName,
        platform: hrDevice.platform,
        model: hrDevice.model,
        lastActive: hrDevice.lastActive,
        batteryLevel: hrDevice.batteryLevel,
        batteryState: hrDevice.batteryState,
        networkType: hrDevice.networkType,
      } : null,
    },
    overview: {
      totalEmployees,
      pendingLeaves,
      todayPresent: todayAttendance,
      onLeaveToday,
      attendanceRate: totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0,
      todayStatus: todayRecord?.checkOut ? 'Checked Out' : (todayRecord?.status || 'Not Checked In'),
      checkInTime: typeof todayRecord?.checkIn === 'object' ? todayRecord.checkIn.time : todayRecord?.checkIn || null,
      checkOutTime: typeof todayRecord?.checkOut === 'object' && todayRecord?.checkOut?.time ? todayRecord.checkOut.time : null
    },
    leaveRequests: leaveRequests.map(l => ({
      id: l._id.toString(),
      employeeName: l.employeeId?.name || 'Unknown',
      department: l.employeeId?.department,
      avatar: l.employeeId?.avatar,
      type: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.totalDays,
      reason: l.reason,
      createdAt: l.createdAt
    })),
    attendanceTrend
  });
}

async function getManagerStats(baseStats: any, companyId: string | null, userId: string) {
  // Get manager's department
  const manager = await User.findById(userId).select('department');
  const department = manager?.department;
  
  const query = {
    ...companyId ? { companyId } : {},
    ...(department ? { department } : {})
  };
  
  const [
    teamSize,
    pendingLeaves,
    todayPresent,
    teamMembers
  ] = await Promise.all([
    User.countDocuments({ ...query, role: 'employee', isActive: true }),
    Leave.countDocuments({ 
      ...query, 
      status: 'Pending'
    }),
    Attendance.countDocuments({ 
      ...query, 
      date: new Date().toISOString().split('T')[0],
      status: 'Present'
    }),
    User.find({ ...query, role: 'employee', isActive: true })
      .select('name email department status avatar')
      .limit(10)
  ]);

  // Get pending approvals for manager
  const pendingApprovals = await Leave.find({
    ...query,
    status: 'Pending'
  })
    .sort({ createdAt: -1 })
    .populate('employeeId', 'name avatar')
    .limit(5);

  // Get personal attendance record for today
  const [managerUser, managerDevice, todayRecord] = await Promise.all([
    User.findById(userId).populate('workShiftId', 'name startTime endTime'),
    LinkedDevice.findOne({ userId, isActive: true })
      .select('deviceName platform lastActive model batteryLevel batteryState networkType'),
    Attendance.findOne({ employeeId: userId, date: new Date().toISOString().split('T')[0] })
  ]);

  const shiftInfo = managerUser?.workShiftId as any;

  return NextResponse.json({
    ...baseStats,
    department: department || 'Not Assigned',
    employee: {
      name: managerUser?.name,
      department: managerUser?.department,
      joiningDate: managerUser?.joiningDate,
      shift: shiftInfo ? {
        name: shiftInfo.name,
        startTime: shiftInfo.startTime,
        endTime: shiftInfo.endTime
      } : null,
      linkedDevice: managerDevice ? {
        deviceName: managerDevice.deviceName,
        platform: managerDevice.platform,
        model: managerDevice.model,
        lastActive: managerDevice.lastActive,
        batteryLevel: managerDevice.batteryLevel,
        batteryState: managerDevice.batteryState,
        networkType: managerDevice.networkType,
      } : null,
    },
    overview: {
      teamSize,
      pendingLeaves,
      todayPresent,
      attendanceRate: teamSize > 0 ? Math.round((todayPresent / teamSize) * 100) : 0,
      todayStatus: todayRecord?.checkOut ? 'Checked Out' : (todayRecord?.status || 'Not Checked In'),
      checkInTime: typeof todayRecord?.checkIn === 'object' ? todayRecord.checkIn.time : todayRecord?.checkIn || null,
      checkOutTime: typeof todayRecord?.checkOut === 'object' && todayRecord?.checkOut?.time ? todayRecord.checkOut.time : null
    },
    teamMembers: teamMembers.map(m => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      department: m.department,
      status: m.status,
      avatar: m.avatar
    })),
    pendingApprovals: pendingApprovals.map(a => ({
      id: a._id.toString(),
      employeeName: a.employeeId?.name || 'Unknown',
      avatar: a.employeeId?.avatar,
      type: a.leaveType,
      days: a.totalDays,
      startDate: a.startDate,
      createdAt: a.createdAt
    }))
  });
}

import mongoose from 'mongoose';

async function getEmployeeStats(baseStats: any, companyId: string | null, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  // Convert string ID to MongoDB ObjectId for reliable querying
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get employee info with shift and linked device
  const [employee, linkedDevice] = await Promise.all([
    User.findById(userId)
      .select('name department joiningDate workShiftId companyId leaveBalances')
      .populate('workShiftId', 'name startTime endTime'),
    LinkedDevice.findOne({ userId: userObjectId, isActive: true })
      .select('deviceName platform lastActive model batteryLevel batteryState networkType')
  ]);
  
  // Get company settings for geofencing
  const company = await Company.findById(employee?.companyId)
    .select('officeLocation geoFenceRadius enableGeoFencing');
  
  const shiftInfo = employee?.workShiftId as any;
  
  // Get this week's attendance
  const weekAttendance = await Attendance.find({
    employeeId: userId,
    date: { $gte: startOfWeek.toISOString().split('T')[0] }
  }).sort({ date: -1 });

  // Calculate attendance rate for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthAttendance = await Attendance.countDocuments({
    employeeId: userId,
    date: { $gte: thirtyDaysAgo.toISOString().split('T')[0] },
    status: { $in: ['Present', 'Late', 'On Time'] }
  });
  const attendanceRate = Math.round((monthAttendance / 30) * 100);

  // Calculate hours this week
  const hoursThisWeek = weekAttendance.reduce((total, record) => {
    const checkInTime = record.checkIn?.time || record.checkIn;
    const checkOutTime = record.checkOut?.time || record.checkOut;
    if (checkInTime && checkOutTime && typeof checkInTime === 'string' && typeof checkOutTime === 'string') {
      const [inH, inM] = checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);
      return total + (outH - inH) + (outM - inM) / 60;
    }
    return total;
  }, 0);

  // Get all required stats in a single parallel fetch
  const [upcomingLeaves, leaveHistory, todayRecord] = await Promise.all([
    Leave.find({
      employeeId: userId,
      startDate: { $gte: new Date() },
      status: 'Approved'
    }).sort({ startDate: 1 }).limit(3),
    Leave.find({
      employeeId: userId,
      status: 'Approved'
    }).select('totalDays'),
    Attendance.findOne({
      employeeId: userId,
      date: today
    })
  ]);

  // Use balances from User model Map if available, otherwise aggregate
  let totalAllocated = 0;
  let totalUsed = 0;

  if (employee?.leaveBalances && (employee.leaveBalances as any).size > 0) {
    (employee.leaveBalances as any).forEach((val: any) => {
      totalAllocated += (val.allocated || 0);
      totalUsed += (val.used || 0);
    });
  } else {
    // Fallback or default values if no specific balances are set
    totalAllocated = 24; 
    totalUsed = leaveHistory.reduce((sum, l) => sum + (l.totalDays || 0), 0);
  }

  const leaveBalance = {
    total: totalAllocated,
    used: totalUsed,
    remaining: Math.max(0, totalAllocated - totalUsed)
  };

  // Get recent activity
  const recentActivity = await Attendance.find({ employeeId: userId })
    .sort({ date: -1 })
    .limit(5)
    .select('date checkIn checkOut status');

  return NextResponse.json({
    ...baseStats,
    employee: {
      name: employee?.name,
      department: employee?.department,
      joiningDate: employee?.joiningDate,
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
      companySettings: company ? {
        location: company.officeLocation,
        radius: company.geoFenceRadius,
        enabled: company.enableGeoFencing
      } : null
    },
    overview: {
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      attendanceRate,
      targetHours: 40,
      todayStatus: todayRecord?.checkOut ? 'Checked Out' : (todayRecord?.status || 'Not Checked In'),
      checkInTime: typeof todayRecord?.checkIn === 'object' ? todayRecord.checkIn.time : todayRecord?.checkIn || null,
      checkOutTime: typeof todayRecord?.checkOut === 'object' && todayRecord?.checkOut?.time ? todayRecord.checkOut.time : null
    },
    leaveBalance,
    upcomingLeaves: upcomingLeaves.map(l => ({
      id: l._id.toString(),
      type: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.totalDays,
      status: l.status
    })),
    recentActivity: recentActivity.map(a => ({
      date: a.date,
      checkIn: typeof a.checkIn === 'object' ? a.checkIn.time : a.checkIn,
      checkOut: typeof a.checkOut === 'object' ? a.checkOut.time : a.checkOut,
      status: a.status
    }))
  });
}
