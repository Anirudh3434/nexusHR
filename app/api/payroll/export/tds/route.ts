import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payroll from '@/models/Payroll';
import Employee from '@/models/Employee';
import Company from '@/models/Company';
import ActivityLog from '@/models/ActivityLog';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { 
  generateQuarterlyTdsReturn, 
  generateEmployeeComputationStatement,
  computeEmployeeTax,
  TdsQuarter,
  TdsEmployeeQuarterlyInput,
  LEGAL_DISCLAIMER_TEXT
} from '@/services/statutory/tdsExportService';

export const runtime = 'nodejs';

/**
 * POST: Generate e-TDS Quarterly Return (Form 138 / Form 24Q) or Employee Tax Computation Statement
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr', 'employee'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { financialYear, quarter, action = 'quarterly_return', employeeId } = body;
    const queryCompanyId = body.companyId;
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId || !financialYear) {
      return NextResponse.json({ message: 'companyId and financialYear are required' }, { status: 400 });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    const tan = (company as any).statutoryConfig?.other?.tanNumber || (company as any).tan || 'MUMB12345E';
    const pan = (company as any).pan || 'AAACC1234C';

    const companyInfo = {
      companyName: (company as any).name || 'NexusHR Enterprise',
      tan,
      pan,
      address: (company as any).address || 'Corporate Park',
      city: (company as any).city || 'Mumbai',
      state: (company as any).state || 'Maharashtra',
      pincode: (company as any).pincode || '400001',
      responsiblePersonName: (company as any).authorizedSignatory?.name || 'Principal Officer',
      responsiblePersonDesignation: (company as any).authorizedSignatory?.designation || 'Director',
    };

    const parts = financialYear.split('-');
    const startYear = parseInt(parts[0], 10);

    // Quarter months mapping
    let quarterMonths: number[];
    if (quarter === 'Q1') quarterMonths = [3, 4, 5]; // Apr, May, Jun
    else if (quarter === 'Q2') quarterMonths = [6, 7, 8]; // Jul, Aug, Sep
    else if (quarter === 'Q3') quarterMonths = [9, 10, 11]; // Oct, Nov, Dec
    else quarterMonths = [0, 1, 2]; // Jan, Feb, Mar

    // If an individual employee requests their own computation statement
    if (action === 'computation_statement') {
      const targetUserId = employeeId || auth.userId;
      if (auth.role === 'employee' && auth.userId !== targetUserId) {
        return NextResponse.json({ message: 'Unauthorized to view other employee computation' }, { status: 403 });
      }

      const emp = await Employee.findOne({ userId: targetUserId, companyId }).populate('userId').lean();
      if (!emp) {
        return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
      }

      // Query payrolls for this financial year (Apr startYear to Mar startYear+1)
      const yr1Payrolls = await Payroll.find({
        employeeId: targetUserId,
        companyId,
        year: startYear,
        month: { $gte: 3 }, // Apr-Dec
      }).lean();

      const yr2Payrolls = await Payroll.find({
        employeeId: targetUserId,
        companyId,
        year: startYear + 1,
        month: { $lte: 2 }, // Jan-Mar
      }).lean();

      const allPayrolls = [...yr1Payrolls, ...yr2Payrolls];

      const monthlyRecords = allPayrolls.map(p => ({
        month: p.month,
        year: p.year,
        grossSalary: (p.baseSalary || 0) + (p.overtimePay || 0) + (p.bonus || 0),
        taxableEarnings: (p.baseSalary || 0) + (p.overtimePay || 0) + (p.bonus || 0),
        exemptAllowances: 0,
        tdsDeducted: (p as any).tdsDeduction || 0,
      }));

      const empInput: TdsEmployeeQuarterlyInput = {
        employeeId: targetUserId,
        employeeName: (emp.userId as any)?.name || 'Employee',
        employeeCode: emp.employeeId || 'EMP',
        pan: emp.panMasked || '•••••1234A',
        taxRegime: ((emp.taxRegime as any) || 'NEW').toUpperCase() as any,
        monthlyRecords,
      };

      const computation = computeEmployeeTax(empInput, quarterMonths);
      const assessmentYear = `${startYear + 1}-${String(startYear + 2).slice(-2)}`;
      const statement = generateEmployeeComputationStatement(
        computation,
        financialYear,
        assessmentYear,
        companyInfo.companyName,
        companyInfo.tan
      );

      return NextResponse.json({
        success: true,
        statement,
        computation,
        legalNotice: LEGAL_DISCLAIMER_TEXT,
      });
    }

    // Otherwise, generate Quarterly Return (Form 138 or Form 24Q) - admin/hr only
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden: Admin or HR access required for quarterly filing' }, { status: 403 });
    }

    if (!quarter || !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return NextResponse.json({ message: 'Valid quarter (Q1, Q2, Q3, Q4) is required' }, { status: 400 });
    }

    // Determine query years and months for the quarter
    const queryYear = quarter === 'Q4' ? startYear + 1 : startYear;
    const payrollRecords = await Payroll.find({
      companyId,
      year: queryYear,
      month: { $in: quarterMonths },
    }).populate('employeeId').lean();

    // Group by employee
    const empPayrollMap = new Map<string, any[]>();
    for (const p of payrollRecords) {
      const uId = (p.employeeId as any)?._id?.toString() || p.employeeId?.toString();
      if (!uId) continue;
      if (!empPayrollMap.has(uId)) empPayrollMap.set(uId, []);
      empPayrollMap.get(uId)!.push(p);
    }

    const employeesInput: TdsEmployeeQuarterlyInput[] = [];
    for (const [uId, records] of empPayrollMap.entries()) {
      const emp = await Employee.findOne({ userId: uId, companyId }).populate('userId').lean();
      const firstRecord = records[0];
      const user = firstRecord.employeeId as any;

      const monthlyRecords = records.map(p => ({
        month: p.month,
        year: p.year,
        grossSalary: (p.baseSalary || 0) + (p.overtimePay || 0) + (p.bonus || 0),
        taxableEarnings: (p.baseSalary || 0) + (p.overtimePay || 0) + (p.bonus || 0),
        exemptAllowances: 0,
        tdsDeducted: (p as any).tdsDeduction || 0,
      }));

      employeesInput.push({
        employeeId: uId,
        employeeName: user?.name || emp?.userId?.name || 'Employee',
        employeeCode: emp?.employeeId || 'EMP',
        pan: emp?.panMasked || '•••••1234A',
        taxRegime: ((emp?.taxRegime as any) || 'NEW').toUpperCase() as any,
        monthlyRecords,
      });
    }

    const result = generateQuarterlyTdsReturn(
      financialYear,
      quarter as TdsQuarter,
      companyInfo,
      employeesInput
    );

    // Audit log
    await ActivityLog.create({
      companyId,
      module: 'statutory',
      userId: auth.userId,
      userName: auth.name || 'System User',
      userEmail: auth.email,
      action: 'export_tds_return',
      resourceType: result.formType,
      resourceName: `${result.formType}_${financialYear}_${quarter}`,
      description: `Generated ${result.formType} (${result.legalGoverningAct}) quarterly return for ${quarter} ${financialYear}: ${result.totalDeductees} deductees, total TDS ₹${result.totalTdsDeducted}.`,
      metadata: {
        financialYear,
        quarter,
        formType: result.formType,
        sectionCode: result.sectionCode,
        totalDeductees: result.totalDeductees,
        totalTdsDeducted: result.totalTdsDeducted,
      },
    });

    return NextResponse.json({
      success: true,
      result,
      legalDisclaimer: LEGAL_DISCLAIMER_TEXT,
    });
  } catch (error: any) {
    console.error('TDS return error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error while generating TDS return' },
      { status: 500 }
    );
  }
}
