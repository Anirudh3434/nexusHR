import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Payroll from '@/models/Payroll';
import Company from '@/models/Company';

// GET payroll records
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || '-1');
    const year = parseInt(searchParams.get('year') || '-1');
    const employeeId = searchParams.get('employeeId');
    const companyId = searchParams.get('companyId');

    let query: any = {};
    if (month !== -1) query.month = month;
    if (year !== -1) query.year = year;
    if (employeeId) query.employeeId = employeeId;
    if (companyId) query.companyId = companyId;

    // --- AUTO-GENERATION TRIGGER (Lazy Cron) ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (companyId && month === currentMonth && year === currentYear && !employeeId) {
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
      .sort({ createdAt: -1 });

    return NextResponse.json(payrolls);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching payroll', error: error.message }, { status: 500 });
  }
}

// Internal helper for auto-generation
async function generatePayrollThunk(month: number, year: number, companyId: string) {
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const users = await User.find({ companyId, isActive: true });
  const company = await Company.findById(companyId).select('overtimeRate');
  const otRate = company?.overtimeRate || 1.5;

  for (const user of users) {
    const existing = await Payroll.findOne({ employeeId: user._id, month, year });
    if (existing && existing.isManualEdit) continue;

    const attendance = await Attendance.find({
      employeeId: user._id,
      date: { $gte: startDate, $lte: endDate }
    });

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
    });
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
    const { month, year, companyId, employeeId } = await req.json();

    if (month === undefined || year === undefined || !companyId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const usersQuery: any = { companyId, isActive: true };
    if (employeeId) usersQuery._id = employeeId;
    const users = await User.find(usersQuery);

    const company = await Company.findById(companyId).select('overtimeRate');
    const otRate = company?.overtimeRate || 1.5;

    const results = [];

    for (const user of users) {
      const attendance = await Attendance.find({
        employeeId: user._id,
        date: { $gte: startDate, $lte: endDate }
      });

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
      });

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
    const { id, status, paymentDate, paymentMethod, paymentDetails, transactionReference, accountNumber, note, ...manualFields } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'Missing payroll ID' }, { status: 400 });
    }

    const updateData: any = { note };
    if (status) updateData.status = status;
    if (paymentDate) updateData.paymentDate = new Date(paymentDate);
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    // Encrypt sensitive payment payload if provided
    if (paymentDetails || transactionReference || accountNumber) {
      const { encryptObject, maskAccountNumber, maskGeneric } = await import('@/lib/security/encryption');
      const payload = {
        ...(paymentDetails || {}),
        accountNumber: accountNumber || paymentDetails?.accountNumber,
        transactionReference: transactionReference || paymentDetails?.transactionReference,
        paymentMethod: paymentMethod || 'bank_transfer',
        paidAt: paymentDate || new Date(),
      };
      updateData.encryptedPaymentDetails = encryptObject(payload);
      if (payload.accountNumber) updateData.accountNumberMasked = maskAccountNumber(payload.accountNumber);
      if (payload.transactionReference) updateData.transactionReferenceMasked = maskGeneric(payload.transactionReference, 4);
    }

    if (Object.keys(manualFields).length > 0) {
      Object.assign(updateData, manualFields);
      updateData.isManualEdit = true;
    }

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
      });

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
      });
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
    return NextResponse.json(payroll);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating payroll', error: error.message }, { status: 500 });
  }
}
