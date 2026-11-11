import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Payroll from '@/models/Payroll';
import Company from '@/models/Company';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { notify } from '@/lib/notify';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// GET payroll records
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = auth.role === 'super_admin';
    const isPrivileged = hasRole(auth.role, ['super_admin', 'admin', 'hr']);

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || '-1');
    const year = parseInt(searchParams.get('year') || '-1');
    const employeeId = searchParams.get('employeeId');
    const payrollId = searchParams.get('id');
    const queryCompanyId = searchParams.get('companyId');
    const statusParam = searchParams.get('status');

    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    // companyId ALWAYS from session (super_admin may pass explicit filter)
    const companyId = isSuperAdmin ? (queryCompanyId || auth.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    let query: any = { companyId };
    if (payrollId) query._id = payrollId;
    if (month !== -1) query.month = month;
    if (year !== -1) query.year = year;
    if (statusParam) query.status = statusParam;

    if (!isPrivileged) {
      // Employees can only view their own payroll records once payment is done (Paid status)
      query.employeeId = auth.userId;
      query.status = 'Paid';
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    // --- AUTO-GENERATION TRIGGER (Lazy Cron) ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (isPrivileged && companyId && month === currentMonth && year === currentYear && !employeeId && !payrollId) {
      const existingCount = await Payroll.countDocuments({ companyId, month, year });
      
      if (existingCount === 0) {
        const company = await Company.findById(companyId).select('payrollCycleDate');
        const cycleDate = company?.payrollCycleDate || 28;
        
        if (today.getDate() >= cycleDate) {
          console.log(`[Payroll] Auto-triggering generation for ${month}/${year}`);
          await generatePayrollThunk(month, year, companyId);
        }
      }
    }

    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'name department designation email')
      .populate('companyId', 'name logo address phone email website')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(payrolls);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching payroll', error: error.message }, { status: 500 });
  }
}

// Internal helper for auto-generation
async function generatePayrollThunk(month: number, year: number, companyId: string) {
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const users = await User.find({ companyId, isActive: true }).lean();
  const company = await Company.findById(companyId).select('overtimeRate');
  const otRate = company?.overtimeRate || 1.5;

  for (const user of users) {
    const existing = await Payroll.findOne({ employeeId: user._id, month, year });
    if (existing && existing.isManualEdit) continue;

    const attendance = await Attendance.find({
      employeeId: user._id,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    let totalLateMinutes = 0, totalOvertimeHours = 0;
    attendance.forEach(record => {
      totalLateMinutes += (record.lateMinutes || 0);
      // Only include pending records for fresh generation
      if (record.overtimeStatus === 'pending' || !record.overtimeStatus) {
        totalOvertimeHours += (record.overtimeHours || 0) + (record.manualOvertimeHours || 0);
      }
    });

    const unpaidLeaves = await Leave.find({
      employeeId: user._id,
      type: 'Unpaid', status: 'Approved',
      startDate: { $lte: endDate }, endDate: { $gte: startDate }
    }).lean();
    let totalUnpaidDays = 0;
    unpaidLeaves.forEach(l => totalUnpaidDays += (l.totalDays || 0));

    const baseSalary = user.salary || 0;
    const daysInMonth = 30;
    const dailyRate = baseSalary / daysInMonth;
    const hourlyRate = dailyRate / 8;
    const minuteRate = hourlyRate / 60;

    let overtimePay = Math.round(totalOvertimeHours * hourlyRate * otRate);
    const lateDeduction = Math.round(totalLateMinutes * minuteRate * 0.5);
    const leaveDeduction = Math.round(totalUnpaidDays * dailyRate);
    
    // Handle Overtime Preference
    if (user.overtimePreference === 'leave' && totalOvertimeHours > 0) {
      overtimePay = 0;
      await User.findByIdAndUpdate(user._id, { 
        $inc: { compOffBalance: totalOvertimeHours } 
      });
    }

    const netSalary = baseSalary + overtimePay - lateDeduction - leaveDeduction;

    const payrollData = {
      employeeId: user._id, companyId, month, year, baseSalary,
      overtimeHours: totalOvertimeHours, overtimePay,
      totalLateMinutes, lateDeduction, unpaidLeaves: totalUnpaidDays,
      leaveDeduction, netSalary, status: existing?.status || 'Generated',
      note: user.overtimePreference === 'leave' && totalOvertimeHours > 0 
        ? `${existing?.note || ''} (OT converted to Leave)`.trim() 
        : existing?.note
    };

    const record = await Payroll.findOneAndUpdate({ employeeId: user._id, month, year }, payrollData, { upsert: true, new: true });

    // Sync OT Status
    await Attendance.updateMany(
      { employeeId: user._id, date: { $gte: startDate, $lte: endDate }, $or: [{ overtimeHours: { $gt: 0 } }, { manualOvertimeHours: { $gt: 0 } }] },
      { $set: { overtimeStatus: user.overtimePreference === 'leave' ? 'comp_off' : 'paid', payrollId: record._id } }
    );
  }
}

// POST: Generate payroll for a specific month
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    if (body.companyId && auth.role !== 'super_admin' && body.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = auth.role === 'super_admin' ? (body.companyId || auth.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    const { month, year, employeeId } = body;

    if (month === undefined || year === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const usersQuery: any = { companyId, isActive: true };
    if (employeeId) usersQuery._id = employeeId;
    const users = await User.find(usersQuery).lean();

    const company = await Company.findById(companyId).select('overtimeRate');
    const otRate = company?.overtimeRate || 1.5;

    const results = [];

    for (const user of users) {
      const attendance = await Attendance.find({
        employeeId: user._id,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      let totalLateMinutes = 0, totalOvertimeHours = 0;
      attendance.forEach(record => {
        totalLateMinutes += (record.lateMinutes || 0);
        // Only include pending records for fresh generation
        if (record.overtimeStatus === 'pending' || !record.overtimeStatus) {
          totalOvertimeHours += (record.overtimeHours || 0) + (record.manualOvertimeHours || 0);
        }
      });

      const unpaidLeaves = await Leave.find({
        employeeId: user._id,
        type: 'Unpaid', status: 'Approved',
        startDate: { $lte: endDate }, endDate: { $gte: startDate }
      }).lean();

      let totalUnpaidDays = 0;
      unpaidLeaves.forEach(leave => totalUnpaidDays += (leave.totalDays || 0));

      const baseSalary = user.salary || 0;
      const daysInMonth = 30;
      const dailyRate = baseSalary / daysInMonth;
      const hourlyRate = dailyRate / 8;
      const minuteRate = hourlyRate / 60;

      let overtimePay = Math.round(totalOvertimeHours * hourlyRate * otRate);
      const lateDeduction = Math.round(totalLateMinutes * minuteRate * 0.5);
      const leaveDeduction = Math.round(totalUnpaidDays * dailyRate);
      
      // Handle Overtime Preference
      if (user.overtimePreference === 'leave' && totalOvertimeHours > 0) {
        overtimePay = 0;
        await User.findByIdAndUpdate(user._id, { 
          $inc: { compOffBalance: totalOvertimeHours } 
        });
      }

      const netSalary = baseSalary + overtimePay - lateDeduction - leaveDeduction;

      const existing = await Payroll.findOne({ employeeId: user._id, month, year });
      if (existing && existing.isManualEdit) {
        results.push(existing);
        continue;
      }

      const payrollData = {
        employeeId: user._id, companyId, month, year, baseSalary,
        overtimeHours: totalOvertimeHours, overtimePay,
        totalLateMinutes, lateDeduction, unpaidLeaves: totalUnpaidDays,
        leaveDeduction, netSalary, status: existing?.status || 'Generated',
        note: user.overtimePreference === 'leave' && totalOvertimeHours > 0 
          ? `${existing?.note || ''} (OT converted to Leave)`.trim() 
          : existing?.note
      };

      const record = await Payroll.findOneAndUpdate(
        { employeeId: user._id, month, year },
        payrollData,
        { upsert: true, new: true }
      );
      
      // Sync OT Status (skip rejected)
      await Attendance.updateMany(
        { 
          employeeId: user._id, 
          date: { $gte: startDate, $lte: endDate }, 
          $or: [{ overtimeHours: { $gt: 0 } }, { manualOvertimeHours: { $gt: 0 } }],
          overtimeStatus: { $in: ['pending', null, undefined] }
        },
        { $set: { overtimeStatus: user.overtimePreference === 'leave' ? 'comp_off' : 'paid', payrollId: record._id } }
      );

      results.push(record);
    }

    return NextResponse.json({ message: `Payroll generated for ${results.length} employees`, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error generating payroll', error: error.message }, { status: 500 });
  }
}

// PATCH: Update payroll status or manual fields
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { id, status, paymentDate, paymentMethod, note, baseSalary, netSalary } = body;

    if (!id) {
      return NextResponse.json({ message: 'Missing payroll ID' }, { status: 400 });
    }

    // Same-company check
    const existingRecord = await Payroll.findById(id).select('companyId');
    if (!existingRecord) return NextResponse.json({ message: 'Payroll not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existingRecord.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    // Strict allowlist: ONLY status, paymentDate, paymentMethod, note + numeric baseSalary/netSalary. All other keys dropped.
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (paymentDate) updateData.paymentDate = new Date(paymentDate);
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (note !== undefined) updateData.note = note;

    let hasNumericOverride = false;
    if (baseSalary !== undefined) {
      const n = Number(baseSalary);
      if (Number.isNaN(n)) return NextResponse.json({ message: 'Invalid baseSalary' }, { status: 400 });
      updateData.baseSalary = n;
      hasNumericOverride = true;
    }
    if (netSalary !== undefined) {
      const n = Number(netSalary);
      if (Number.isNaN(n)) return NextResponse.json({ message: 'Invalid netSalary' }, { status: 400 });
      updateData.netSalary = n;
      hasNumericOverride = true;
    }
    if (hasNumericOverride) updateData.isManualEdit = true;

    // --- REFRESH ACTION ---
    if (status === 'refresh') {
      const existingPayroll = await Payroll.findById(id);
      if (!existingPayroll) return NextResponse.json({ message: 'Payroll not found' }, { status: 404 });
      
      const user = await User.findById(existingPayroll.employeeId);
      if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

      const company = await Company.findById(existingPayroll.companyId).select('overtimeRate');
      const otRate = company?.overtimeRate || 1.5;

      const startDate = new Date(Date.UTC(existingPayroll.year, existingPayroll.month, 1));
      const endDate = new Date(Date.UTC(existingPayroll.year, existingPayroll.month + 1, 0, 23, 59, 59, 999));

      const attendance = await Attendance.find({
        employeeId: user._id,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      let totalLateMinutes = 0, totalOvertimeHours = 0;
      attendance.forEach(record => {
        totalLateMinutes += (record.lateMinutes || 0);
        // During refresh, include pending AND records already linked to this payroll
        if (record.overtimeStatus === 'pending' || !record.overtimeStatus || record.payrollId?.toString() === id) {
          totalOvertimeHours += (record.overtimeHours || 0) + (record.manualOvertimeHours || 0);
        }
      });

      const unpaidLeaves = await Leave.find({
        employeeId: user._id,
        type: 'Unpaid', status: 'Approved',
        startDate: { $lte: endDate }, endDate: { $gte: startDate }
      }).lean();
      let totalUnpaidDays = 0;
      unpaidLeaves.forEach(l => totalUnpaidDays += (l.totalDays || 0));

      const baseSalary = user.salary || 0;
      const daysInMonth = 30;
      const dailyRate = baseSalary / daysInMonth;
      const hourlyRate = dailyRate / 8;
      const minuteRate = hourlyRate / 60;

      let overtimePay = Math.round(totalOvertimeHours * hourlyRate * otRate);
      const lateDeduction = Math.round(totalLateMinutes * minuteRate * 0.5);
      const leaveDeduction = Math.round(totalUnpaidDays * dailyRate);

      if (user.overtimePreference === 'leave' && totalOvertimeHours > 0) {
        overtimePay = 0;
      }

      const netSalary = baseSalary + overtimePay - lateDeduction - leaveDeduction;

      updateData.baseSalary = baseSalary;
      updateData.overtimeHours = totalOvertimeHours;
      updateData.overtimePay = overtimePay;
      updateData.totalLateMinutes = totalLateMinutes;
      updateData.lateDeduction = lateDeduction;
      updateData.unpaidLeaves = totalUnpaidDays;
      updateData.leaveDeduction = leaveDeduction;
      updateData.netSalary = netSalary;
      updateData.status = 'Generated'; // Reset to generated on refresh
      updateData.isManualEdit = false; // Reset manual edit on refresh if requested
      
      // Update OT Status again (skip rejected)
      await Attendance.updateMany(
        { 
          employeeId: user._id, 
          date: { $gte: startDate, $lte: endDate }, 
          $and: [
            { $or: [{ overtimeHours: { $gt: 0 } }, { manualOvertimeHours: { $gt: 0 } }] },
            { $or: [{ overtimeStatus: { $in: ['pending', null, undefined] } }, { payrollId: id }] }
          ]
        },
        { $set: { overtimeStatus: user.overtimePreference === 'leave' ? 'comp_off' : 'paid', payrollId: id } }
      );
    }

    const payroll = await Payroll.findByIdAndUpdate(id, updateData, { new: true });

    if (payroll && status === 'Paid') {
      const monthLabel = MONTH_NAMES[payroll.month] || `Month ${payroll.month + 1}`;
      await notify({
        companyId: String(payroll.companyId),
        kind: 'payroll',
        title: 'Salary disbursed',
        message: `Your salary for ${monthLabel} ${payroll.year} of ₹${(payroll.netSalary || 0).toLocaleString('en-IN')} has been disbursed.`,
        href: '/payslips',
        meta: 'Paid',
        recipientIds: [String(payroll.employeeId)],
        actorId: auth.userId,
        dedupeKey: `payroll-paid:${payroll._id}:${status}`,
      });
    }

    return NextResponse.json(payroll);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating payroll', error: error.message }, { status: 500 });
  }
}
