import { calculateCodeWages, EarningsBreakdown } from './wageDefinitionService';
import { getPfCeilingForMonth, PF_STATUTORY_CONSTANTS } from '@/lib/statutory/pfRules';
import { ResolvedCompanyRules, ResolvedEmployeeRules } from './ruleResolverService';

export interface MonthlyAttendanceInput {
  calendarDays: number; // 28, 29, 30, 31
  lopDays: number; // Loss of pay / NCP days
  joiningDate?: Date;
  exitDate?: Date;
}

export interface DetailedWageCalculationResult {
  calendarDays: number;
  paidDays: number;
  ncpDays: number; // LOP days
  prorationFactor: number;
  earnings: {
    basic: number;
    hra: number;
    da: number;
    conveyance: number;
    medical: number;
    specialAllowance: number;
    overtimePay: number;
    bonus: number;
    grossEarnings: number;
  };
  statutoryWages: {
    codeWages: number;
    epfWages: number;
    epsWages: number;
    edliWages: number;
    esiWages: number;
  };
  employeeDeductions: {
    pf: number;
    vpf: number;
    totalPf: number;
    esi: number;
    pt: number;
    tds: number;
    totalDeductions: number;
  };
  employerContributions: {
    epf: number;
    eps: number;
    totalPf: number;
    edli: number;
    adminCharges: number;
    esi: number;
    totalEmployerLiability: number;
  };
  netPay: number;
  ctc: number;
}

/**
 * Calculate complete statutory wage breakdown for an employee in a given wage month.
 */
export function calculateEmployeeMonthlyStatutory(
  unproratedEarnings: EarningsBreakdown,
  attendance: MonthlyAttendanceInput,
  companyRules: ResolvedCompanyRules,
  employeeRules: ResolvedEmployeeRules,
  year: number,
  month: number
): DetailedWageCalculationResult {
  const calendarDays = attendance.calendarDays;
  let paidDays = calendarDays - (attendance.lopDays || 0);

  // Mid-month joiner proration
  if (attendance.joiningDate) {
    const join = new Date(attendance.joiningDate);
    const joinYear = join.getUTCFullYear();
    const joinMonth = join.getUTCMonth();
    if (joinYear === year && joinMonth === month) {
      const joinDay = join.getUTCDate();
      const unworkedBeforeJoin = joinDay - 1;
      paidDays = Math.max(0, paidDays - unworkedBeforeJoin);
    }
  }

  // Mid-month resignation / exit proration
  if (attendance.exitDate) {
    const exit = new Date(attendance.exitDate);
    const exitYear = exit.getUTCFullYear();
    const exitMonth = exit.getUTCMonth();
    if (exitYear === year && exitMonth === month) {
      const exitDay = exit.getUTCDate();
      const unworkedAfterExit = calendarDays - exitDay;
      paidDays = Math.max(0, paidDays - unworkedAfterExit);
    }
  }

  paidDays = Math.max(0, Math.min(paidDays, calendarDays));
  const prorationFactor = calendarDays > 0 ? paidDays / calendarDays : 1;

  // Prorate earnings
  const basic = Math.round((unproratedEarnings.basic || 0) * prorationFactor);
  const hra = Math.round((unproratedEarnings.hra || 0) * prorationFactor);
  const da = Math.round((unproratedEarnings.da || 0) * prorationFactor);
  const conveyance = Math.round((unproratedEarnings.conveyance || 0) * prorationFactor);
  const medical = Math.round((unproratedEarnings.medical || 0) * prorationFactor);
  const specialAllowance = Math.round((unproratedEarnings.specialAllowance || 0) * prorationFactor);
  const overtimePay = Math.round(unproratedEarnings.overtimePay || 0);
  const bonus = Math.round(unproratedEarnings.bonus || 0);

  const grossEarnings = basic + hra + da + conveyance + medical + specialAllowance + overtimePay + bonus;

  // Code on Wages definition (from 21 Nov 2025)
  const wageMonthDate = new Date(Date.UTC(year, month, 15));
  const codeWageResult = calculateCodeWages({
    basic,
    da,
    hra,
    conveyance,
    medical,
    specialAllowance,
    overtimePay,
    bonus,
  }, wageMonthDate);

  const codeWages = codeWageResult.statutoryCodeWages;

  // --- EPF / EPS Calculation ---
  let epfWages = 0;
  let epsWages = 0;
  let edliWages = 0;
  let employeePf = 0;
  let vpf = 0;
  let employerEps = 0;
  let employerEpf = 0;
  let edli = 0;
  let adminCharges = 0;

  if (employeeRules.pf.applicable && basic > 0) {
    const ceilingInfo = getPfCeilingForMonth(year, month);
    // If proration applies (LOP or joiner), statutory ceiling is also prorated per EPFO rules
    const effectiveCeiling = Math.round(ceilingInfo.ceiling * prorationFactor);

    if (employeeRules.pf.wageCeilingMode === 'actual_wages') {
      epfWages = codeWages;
    } else {
      epfWages = Math.min(codeWages, effectiveCeiling);
    }

    // EPS and EDLI are always capped at the statutory ceiling by law
    epsWages = Math.min(codeWages, effectiveCeiling);
    edliWages = Math.min(codeWages, effectiveCeiling);

    employeePf = Math.round(epfWages * PF_STATUTORY_CONSTANTS.EMPLOYEE_RATE);

    // VPF (Voluntary Provident Fund)
    if (employeeRules.pf.vpfAmount > 0) {
      vpf = employeeRules.pf.vpfAmount;
    } else if (employeeRules.pf.vpfPercentage > 0) {
      vpf = Math.round(basic * (employeeRules.pf.vpfPercentage / 100));
    }

    // Employer share: EPS 8.33% on capped wages, balance to EPF
    employerEps = Math.round(epsWages * PF_STATUTORY_CONSTANTS.EPS_RATE);
    employerEpf = employeePf - employerEps;

    // EDLI 0.5% and Admin charges 0.5%
    edli = Math.round(edliWages * PF_STATUTORY_CONSTANTS.EDLI_RATE);
    adminCharges = Math.round(epfWages * PF_STATUTORY_CONSTANTS.ADMIN_RATE);
  }

  // --- ESI Calculation ---
  let esiWages = 0;
  let employeeEsi = 0;
  let employerEsi = 0;

  if (employeeRules.esi.applicable && grossEarnings > 0) {
    // ESI threshold applies to unprorated monthly earning rate
    const unproratedGross = (unproratedEarnings.basic || 0) + (unproratedEarnings.hra || 0) +
      (unproratedEarnings.da || 0) + (unproratedEarnings.specialAllowance || 0) +
      (unproratedEarnings.conveyance || 0) + (unproratedEarnings.medical || 0);

    const isEligible = unproratedGross <= employeeRules.esi.threshold;

    if (isEligible) {
      esiWages = grossEarnings;
      employeeEsi = Math.round(esiWages * 0.0075);
      employerEsi = Math.round(esiWages * 0.0325);
    }
  }

  // --- Professional Tax (PT) Calculation ---
  let pt = 0;
  if (employeeRules.pt.applicable) {
    const state = employeeRules.pt.workState?.toLowerCase();
    if (state === 'maharashtra') {
      // Men earning > 10,000: Rs 200 (March - Jan), Rs 300 in Feb (month 1)
      if (grossEarnings > 10000) {
        pt = month === 1 ? 300 : 200;
      }
    } else if (state === 'karnataka') {
      // Karnataka: Rs 200 for gross >= 25,000
      if (grossEarnings >= 25000) {
        pt = 200;
      }
    } else if (state === 'telangana' || state === 'andhra pradesh') {
      if (grossEarnings > 20000) pt = 200;
      else if (grossEarnings > 15000) pt = 150;
    } else if (state === 'gujarat') {
      if (grossEarnings > 12000) pt = 200;
    }
  }

  const tds = 0; // Handled per annual projection in Phase 6
  const totalEmployeePf = employeePf + vpf;
  const totalEmployeeDeductions = totalEmployeePf + employeeEsi + pt + tds;
  const totalEmployerLiability = (employerEpf + employerEps) + edli + adminCharges + employerEsi;

  const netPay = grossEarnings - totalEmployeeDeductions;
  const ctc = grossEarnings + (companyRules.pf.employerShareInCtc ? 0 : totalEmployerLiability);

  return {
    calendarDays,
    paidDays,
    ncpDays: attendance.lopDays || 0,
    prorationFactor,
    earnings: {
      basic,
      hra,
      da,
      conveyance,
      medical,
      specialAllowance,
      overtimePay,
      bonus,
      grossEarnings,
    },
    statutoryWages: {
      codeWages,
      epfWages,
      epsWages,
      edliWages,
      esiWages,
    },
    employeeDeductions: {
      pf: employeePf,
      vpf,
      totalPf: totalEmployeePf,
      esi: employeeEsi,
      pt,
      tds,
      totalDeductions: totalEmployeeDeductions,
    },
    employerContributions: {
      epf: employerEpf,
      eps: employerEps,
      totalPf: employerEpf + employerEps,
      edli,
      adminCharges,
      esi: employerEsi,
      totalEmployerLiability,
    },
    netPay,
    ctc,
  };
}
