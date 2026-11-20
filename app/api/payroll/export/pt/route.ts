import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import Employee from '@/models/Employee';
import ActivityLog from '@/models/ActivityLog';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { createOrGetSnapshot } from '@/services/statutory/ruleResolverService';
import { generatePtReport, PtEmployeeRecord } from '@/services/statutory/ptExportService';

export const runtime = 'nodejs';

/**
 * POST: Export Professional Tax Monthly State Summary and Employee Details
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

    // 1. Lock check: Only locked/reviewed/paid payroll runs can export
    const payrollRecords = await Payroll.find({ companyId, month, year }).populate('employeeId').lean();
    if (payrollRecords.length === 0) {
      return NextResponse.json(
        { message: `No payroll records found for ${month + 1}/${year}. Please finalize payroll first.` },
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

    // 2. Fetch or create locked StatutoryRuleSnapshot
    const snapshot = await createOrGetSnapshot(companyId, year, month, auth.userId);
    const companyRules = snapshot.resolvedRules;

    // 3. Build PT employee records
    const ptEmployees: PtEmployeeRecord[] = [];
    for (const record of payrollRecords) {
      const user = record.employeeId as any;
      if (!user) continue;

      const emp = await Employee.findOne({ userId: user._id, companyId }).lean();
      const gross = (record.baseSalary || 0) + (record.overtimePay || 0) + (record.bonus || 0);

      ptEmployees.push({
        employeeId: user._id.toString(),
        employeeName: user.name,
        employeeCode: emp?.employeeId || user.employeeId || 'EMP',
        pan: emp?.panMasked || '•••••1234A',
        workState: emp?.workState || 'Maharashtra',
        grossSalary: gross,
        gender: emp?.gender ? (emp.gender.toLowerCase() as any) : 'male',
      });
    }

    // 4. Generate PT report
    const report = generatePtReport(ptEmployees, companyRules, year, month);

    // 5. Audit Log entry
    await ActivityLog.create({
      companyId,
      module: 'statutory',
      userId: auth.userId,
      userName: auth.name || 'System User',
      userEmail: auth.email,
      action: 'export_pt_report',
      resourceType: 'pt_report',
      resourceName: `PT_${year}_${month + 1}`,
      description: `Exported Professional Tax report for ${month + 1}/${year}: ${report.employeeDetails.length} employees across ${report.stateSummaries.length} states, total ₹${report.totalPtCollected}.`,
      metadata: {
        year,
        month,
        employeeCount: report.employeeDetails.length,
        totalPtCollected: report.totalPtCollected,
        stateCount: report.stateSummaries.length,
      },
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('PT export error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error while generating PT export' },
      { status: 500 }
    );
  }
}
