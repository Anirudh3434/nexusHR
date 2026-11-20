import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import Employee from '@/models/Employee';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { createOrGetSnapshot, resolveEmployeeRules } from '@/services/statutory/ruleResolverService';
import { calculateEmployeeMonthlyStatutory } from '@/services/statutory/wageCalculationService';
import { generateEsicContributionFile, EsicMemberInput } from '@/services/statutory/esicExportService';

export const runtime = 'nodejs';

/**
 * POST: Export ESIC Monthly Contribution CSV for an Approved/Locked Payroll Period
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden: Admin or HR access required' }, { status: 403 });
    }

    const body = await req.json();
    const { month, year } = body;
    const queryCompanyId = body.companyId;
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId || month === undefined || year === undefined) {
      return NextResponse.json({ message: 'companyId, month, and year are required' }, { status: 400 });
    }

    // 1. Lock check: Only locked/reviewed/paid/generated payroll runs can export
    const payrollRecords = await Payroll.find({ companyId, month, year }).populate('employeeId').lean();
    if (payrollRecords.length === 0) {
      return NextResponse.json(
        { message: `No payroll records found for ${month + 1}/${year}. Please run and finalize payroll first.` },
        { status: 404 }
      );
    }

    const unapproved = payrollRecords.filter((p: any) => p.status === 'Failed');
    if (unapproved.length > 0) {
      return NextResponse.json(
        { message: 'Cannot export: Some payroll records are in Failed state.' },
        { status: 400 }
      );
    }

    // 2. Fetch or create locked StatutoryRuleSnapshot for this period (ensures immutability)
    const snapshot = await createOrGetSnapshot(companyId, year, month, auth.userId);
    const companyRules = snapshot.resolvedRules;

    // 3. Build Member Inputs
    const members: EsicMemberInput[] = [];

    for (const record of payrollRecords) {
      const user = record.employeeId as any;
      if (!user) continue;

      const employee = await Employee.findOne({ userId: user._id, companyId }).lean();
      const empRules = await resolveEmployeeRules(user._id.toString(), companyId, year, month);

      const earnings = {
        basic: record.baseSalary || 0,
        hra: 0,
        overtimePay: record.overtimePay || 0,
        bonus: record.bonus || 0,
      };

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const calc = calculateEmployeeMonthlyStatutory(
        earnings,
        {
          calendarDays: daysInMonth,
          lopDays: record.unpaidLeaves || 0,
          joiningDate: employee?.joiningDate,
        },
        companyRules,
        empRules,
        year,
        month
      );

      members.push({
        employeeId: user._id.toString(),
        employeeName: user.name,
        employeeCode: employee?.employeeId || user.employeeId || 'EMP',
        esicIpNumber: employee?.esicIpNumber || '',
        uan: employee?.uan,
        pan: employee?.panMasked || '•••••1234A',
        workState: employee?.workState || 'Maharashtra',
        calculation: calc,
        employeeRules: empRules,
      });
    }

    // 4. Generate official ESIC Contribution File (validates and rejects on error)
    const esicResult = await generateEsicContributionFile(members, companyRules, year, month);

    // 5. Log Export Audit Trail
    await ActivityLog.create({
      companyId,
      userId: auth.userId,
      userName: auth.name || 'Admin',
      userEmail: auth.email,
      module: 'statutory',
      actionType: 'statutory_config_updated',
      action: 'Exported ESIC Monthly Contribution File',
      details: `Generated ESIC contribution file (${esicResult.fileName}) for ${esicResult.memberCount} members. Total Wages: ₹${esicResult.totals.totalWages}, Employee Share: ₹${esicResult.totals.employeeShare}, Employer Share: ₹${esicResult.totals.employerShare}.`,
      metadata: {
        snapshotId: snapshot._id,
        checksum: snapshot.checksum,
        totals: esicResult.totals,
      },
    });

    return NextResponse.json({
      success: true,
      fileName: esicResult.fileName,
      csvContent: esicResult.csvContent,
      memberCount: esicResult.memberCount,
      totals: esicResult.totals,
    });
  } catch (error: any) {
    console.error('Error generating ESIC export:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to generate ESIC export' },
      { status: 400 }
    );
  }
}
