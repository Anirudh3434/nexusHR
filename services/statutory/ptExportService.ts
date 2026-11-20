/**
 * Professional Tax (PT) Calculation & Reporting Service
 * 
 * Legal References:
 * - Maharashtra: Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975 (Mah. Act No. VIII of 2023)
 *   - Men earning > ₹10,000: ₹200/month (March-January), ₹300 in February (month index 1).
 *   - Women earning ≤ ₹25,000: Exempt.
 * - Karnataka: Karnataka Tax on Professions, Trades, Callings and Employments Act, 1976 (amended by Act 14 of 2023)
 *   - Gross < ₹25,000: ₹0; Gross ≥ ₹25,000: ₹200/month.
 * - Telangana / Andhra Pradesh: Act of 1987 (≤ ₹15k: 0; ₹15k-₹20k: ₹150; > ₹20k: ₹200).
 * - Gujarat: Act of 1976 (≤ ₹12k: 0; > ₹12k: ₹200).
 * - States with no PT: Delhi, Haryana, Uttar Pradesh, Rajasthan, Punjab, Himachal Pradesh, Uttarakhand, Chandigarh, Goa.
 */

import { ResolvedCompanyRules } from './ruleResolverService';

export interface PtEmployeeRecord {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  pan?: string;
  workState: string;
  grossSalary: number;
  gender?: 'male' | 'female' | 'other';
}

export interface PtEmployeeResult {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  pan?: string;
  workState: string;
  grossSalary: number;
  ptDeducted: number;
  slabApplied: string;
  isFebruaryAdjustment: boolean;
}

export interface PtStateSummary {
  state: string;
  registrationNumber: string;
  ptoCircle?: string;
  employeeCount: number;
  totalGrossSalary: number;
  totalPtDeducted: number;
}

export interface PtReportResult {
  month: number;
  year: number;
  stateSummaries: PtStateSummary[];
  employeeDetails: PtEmployeeResult[];
  totalPtCollected: number;
  csvSummary: string;
  csvDetail: string;
}

/**
 * Calculate state-specific Professional Tax for an employee.
 * 
 * @param grossSalary Monthly gross earnings
 * @param state State of employment
 * @param month 0-indexed month (0 = Jan, 1 = Feb, 2 = Mar, etc.)
 * @param gender Optional gender (for Maharashtra female exemption)
 */
export function calculateStatePt(
  grossSalary: number,
  state: string,
  month: number,
  gender: 'male' | 'female' | 'other' = 'male'
): { ptDeducted: number; slabApplied: string; isFebruaryAdjustment: boolean } {
  const normState = (state || '').trim().toLowerCase();
  const isFebruary = month === 1;

  if (grossSalary <= 0) {
    return { ptDeducted: 0, slabApplied: 'Zero Earnings', isFebruaryAdjustment: false };
  }

  // 1. Maharashtra
  if (normState === 'maharashtra') {
    // Women earning <= 25,000 exempt under Mah. Act No. VIII of 2023
    if (gender === 'female' && grossSalary <= 25000) {
      return { ptDeducted: 0, slabApplied: 'Maharashtra Female Exemption (≤ ₹25,000)', isFebruaryAdjustment: false };
    }
    if (grossSalary > 10000) {
      const pt = isFebruary ? 300 : 200;
      return {
        ptDeducted: pt,
        slabApplied: isFebruary ? 'Maharashtra > ₹10,000 (Feb Adjustment: ₹300)' : 'Maharashtra > ₹10,000 (₹200)',
        isFebruaryAdjustment: isFebruary,
      };
    }
    if (grossSalary > 7500 && gender === 'male') {
      return { ptDeducted: 175, slabApplied: 'Maharashtra ₹7,501 - ₹10,000 (₹175)', isFebruaryAdjustment: false };
    }
    return { ptDeducted: 0, slabApplied: 'Maharashtra ≤ ₹7,500 (Nil)', isFebruaryAdjustment: false };
  }

  // 2. Karnataka (Act 14 of 2023)
  if (normState === 'karnataka') {
    if (grossSalary >= 25000) {
      return { ptDeducted: 200, slabApplied: 'Karnataka ≥ ₹25,000 (₹200)', isFebruaryAdjustment: false };
    }
    return { ptDeducted: 0, slabApplied: 'Karnataka < ₹25,000 (Nil)', isFebruaryAdjustment: false };
  }

  // 3. Telangana & Andhra Pradesh
  if (normState === 'telangana' || normState === 'andhra pradesh') {
    if (grossSalary > 20000) {
      return { ptDeducted: 200, slabApplied: `${state} > ₹20,000 (₹200)`, isFebruaryAdjustment: false };
    }
    if (grossSalary > 15000) {
      return { ptDeducted: 150, slabApplied: `${state} ₹15,001 - ₹20,000 (₹150)`, isFebruaryAdjustment: false };
    }
    return { ptDeducted: 0, slabApplied: `${state} ≤ ₹15,000 (Nil)`, isFebruaryAdjustment: false };
  }

  // 4. Gujarat
  if (normState === 'gujarat') {
    if (grossSalary > 12000) {
      return { ptDeducted: 200, slabApplied: 'Gujarat > ₹12,000 (₹200)', isFebruaryAdjustment: false };
    }
    return { ptDeducted: 0, slabApplied: 'Gujarat ≤ ₹12,000 (Nil)', isFebruaryAdjustment: false };
  }

  // 5. West Bengal
  if (normState === 'west bengal') {
    if (grossSalary > 40000) return { ptDeducted: 200, slabApplied: 'West Bengal > ₹40,000 (₹200)', isFebruaryAdjustment: false };
    if (grossSalary > 25000) return { ptDeducted: 150, slabApplied: 'West Bengal ₹25,001 - ₹40,000 (₹150)', isFebruaryAdjustment: false };
    if (grossSalary > 15000) return { ptDeducted: 130, slabApplied: 'West Bengal ₹15,001 - ₹25,000 (₹130)', isFebruaryAdjustment: false };
    if (grossSalary > 10000) return { ptDeducted: 110, slabApplied: 'West Bengal ₹10,001 - ₹15,000 (₹110)', isFebruaryAdjustment: false };
    return { ptDeducted: 0, slabApplied: 'West Bengal ≤ ₹10,000 (Nil)', isFebruaryAdjustment: false };
  }

  // Non-PT states
  return { ptDeducted: 0, slabApplied: `${state} (No State PT Levied)`, isFebruaryAdjustment: false };
}

/**
 * Generate complete State-wise and Employee-wise Professional Tax reports.
 */
export function generatePtReport(
  employees: PtEmployeeRecord[],
  companyRules: ResolvedCompanyRules,
  year: number,
  month: number
): PtReportResult {
  const employeeDetails: PtEmployeeResult[] = [];
  const stateSummaryMap = new Map<string, PtStateSummary>();

  // Initialize configured company PT states
  for (const reg of companyRules.pt.stateRegistrations || []) {
    stateSummaryMap.set(reg.state.toLowerCase(), {
      state: reg.state,
      registrationNumber: reg.registrationNumber,
      ptoCircle: reg.ptoCircle,
      employeeCount: 0,
      totalGrossSalary: 0,
      totalPtDeducted: 0,
    });
  }

  let totalPtCollected = 0;

  for (const emp of employees) {
    const ptCalc = calculateStatePt(emp.grossSalary, emp.workState, month, emp.gender);
    const result: PtEmployeeResult = {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      employeeCode: emp.employeeCode,
      pan: emp.pan,
      workState: emp.workState,
      grossSalary: emp.grossSalary,
      ptDeducted: ptCalc.ptDeducted,
      slabApplied: ptCalc.slabApplied,
      isFebruaryAdjustment: ptCalc.isFebruaryAdjustment,
    };
    employeeDetails.push(result);
    totalPtCollected += ptCalc.ptDeducted;

    // Update state summary
    const key = (emp.workState || 'other').toLowerCase();
    let summary = stateSummaryMap.get(key);
    if (!summary) {
      summary = {
        state: emp.workState || 'Unspecified',
        registrationNumber: 'NOT_REGISTERED',
        employeeCount: 0,
        totalGrossSalary: 0,
        totalPtDeducted: 0,
      };
      stateSummaryMap.set(key, summary);
    }

    summary.employeeCount += 1;
    summary.totalGrossSalary += emp.grossSalary;
    summary.totalPtDeducted += ptCalc.ptDeducted;
  }

  const stateSummaries = Array.from(stateSummaryMap.values());

  // Generate CSV Summary
  const summaryHeader = 'State,Registration Number,PTO Circle,Employee Count,Total Gross Salary,Total PT Deducted';
  const summaryLines = [summaryHeader];
  for (const s of stateSummaries) {
    summaryLines.push(`"${s.state}","${s.registrationNumber}","${s.ptoCircle || ''}",${s.employeeCount},${s.totalGrossSalary},${s.totalPtDeducted}`);
  }
  const csvSummary = summaryLines.join('\r\n');

  // Generate CSV Detail
  const detailHeader = 'Employee Code,Employee Name,PAN,Work State,Gross Salary,PT Deducted,Slab Applied,Feb Adjustment';
  const detailLines = [detailHeader];
  for (const d of employeeDetails) {
    detailLines.push(`"${d.employeeCode}","${d.employeeName}","${d.pan || ''}","${d.workState}",${d.grossSalary},${d.ptDeducted},"${d.slabApplied}",${d.isFebruaryAdjustment ? 'YES' : 'NO'}`);
  }
  const csvDetail = detailLines.join('\r\n');

  return {
    month,
    year,
    stateSummaries,
    employeeDetails,
    totalPtCollected,
    csvSummary,
    csvDetail,
  };
}
