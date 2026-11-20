/**
 * Indian Statutory Provident Fund (EPF/EPS/EDLI) Rules Engine
 * 
 * Legal References:
 * - Pre-17 Sep 2026: Ministry of Labour & Employment Notification G.S.R. 608(E) dated 22 August 2014 (Rs 15,000 ceiling).
 * - From 17 Sep 2026: Ministry of Labour & Employment Gazette Notification S.O. 5109(E) dated 17 September 2026 (Rs 25,000 ceiling).
 * - Proration: Split-month rule for September 2026 (1-16 Sep @ Rs 15,000; 17-30 Sep @ Rs 25,000).
 */

export const PF_STATUTORY_CONSTANTS = {
  PRE_REVISION_CEILING: 15000,
  POST_REVISION_CEILING: 25000,
  PRE_REVISION_MAX_EMPLOYEE_PF: 1800, // 12% of 15,000
  POST_REVISION_MAX_EMPLOYEE_PF: 3000, // 12% of 25,000
  REVISION_EFFECTIVE_DATE: new Date('2026-09-17T00:00:00.000Z'),
  EMPLOYEE_RATE: 0.12, // 12%
  EPS_RATE: 8.33 / 100, // 8.33%
  EDLI_RATE: 0.005, // 0.5%
  ADMIN_RATE: 0.005, // 0.5%
} as const;

export interface PfCeilingInfo {
  ceiling: number;
  maxEmployeePf: number;
  maxEmployerEps: number;
  maxEmployerEpf: number;
  isSplitMonth: boolean;
  effectiveFrom: string;
}

export interface PfCalculationResult {
  basicSalary: number;
  epfWages: number;
  epsWages: number;
  edliWages: number;
  employeePf: number;
  employerEps: number;
  employerEpf: number;
  totalEmployerPf: number;
  ceilingApplied: number;
  isSplitMonth: boolean;
}

/**
 * Get the statutory PF ceiling for a specific effective date (point-in-time).
 * - Prior to 17 Sep 2026: Rs 15,000 ceiling (max employee contribution Rs 1,800).
 * - On or after 17 Sep 2026: Rs 25,000 ceiling (max employee contribution Rs 3,000).
 */
export function getPfCeilingForDate(date: Date = new Date()): PfCeilingInfo {
  const d = new Date(date);
  const cutoff = PF_STATUTORY_CONSTANTS.REVISION_EFFECTIVE_DATE;

  if (d < cutoff) {
    return {
      ceiling: 15000,
      maxEmployeePf: 1800,
      maxEmployerEps: 1250, // 15,000 * 8.33% = 1249.5 -> 1250
      maxEmployerEpf: 550,  // 1800 - 1250 = 550 (3.67%)
      isSplitMonth: false,
      effectiveFrom: '2014-09-01',
    };
  }

  return {
    ceiling: 25000,
    maxEmployeePf: 3000,
    maxEmployerEps: 2083, // 25,000 * 8.33% = 2082.5 -> 2083
    maxEmployerEpf: 917,  // 3000 - 2083 = 917 (3.67%)
    isSplitMonth: false,
    effectiveFrom: '2026-09-17',
  };
}

/**
 * Get the statutory PF ceiling for a complete payroll month (year + 0-indexed month).
 * Handles the September 2026 split-month proration (1-16 Sep @ 15k, 17-30 Sep @ 25k).
 * 
 * @param year e.g. 2026
 * @param month 0-indexed month (0 = Jan, 8 = Sep, 11 = Dec)
 */
export function getPfCeilingForMonth(year: number, month: number): PfCeilingInfo {
  // Pre-September 2026
  if (year < 2026 || (year === 2026 && month < 8)) {
    return {
      ceiling: 15000,
      maxEmployeePf: 1800,
      maxEmployerEps: 1250,
      maxEmployerEpf: 550,
      isSplitMonth: false,
      effectiveFrom: '2014-09-01',
    };
  }

  // September 2026: Split month (30 days total)
  // Days 1-16 (16 days) @ Rs 15,000 ceiling
  // Days 17-30 (14 days) @ Rs 25,000 ceiling
  if (year === 2026 && month === 8) {
    const period1Ceiling = (15000 / 30) * 16; // 8,000.00
    const period2Ceiling = (25000 / 30) * 14; // 11,666.6666...
    const exactProratedCeiling = period1Ceiling + period2Ceiling; // 19,666.6666...
    const roundedCeiling = Math.round(exactProratedCeiling); // 19,667

    // Employee share: 12% of 19,666.67 = 2,360.00
    const maxEmployeePf = Math.round(exactProratedCeiling * PF_STATUTORY_CONSTANTS.EMPLOYEE_RATE);
    // Employer EPS: 8.33% of 19,666.67 = 1,638.23 -> 1,638
    const maxEmployerEps = Math.round(exactProratedCeiling * PF_STATUTORY_CONSTANTS.EPS_RATE);
    // Employer EPF: balance of 12%
    const maxEmployerEpf = maxEmployeePf - maxEmployerEps; // 722

    return {
      ceiling: roundedCeiling,
      maxEmployeePf,
      maxEmployerEps,
      maxEmployerEpf,
      isSplitMonth: true,
      effectiveFrom: '2026-09-01',
    };
  }

  // October 2026 onwards
  return {
    ceiling: 25000,
    maxEmployeePf: 3000,
    maxEmployerEps: 2083,
    maxEmployerEpf: 917,
    isSplitMonth: false,
    effectiveFrom: '2026-09-17',
  };
}

/**
 * Calculate PF breakdown for a payroll month.
 * 
 * @param basicSalary Employee monthly basic salary
 * @param year Year of payroll (e.g. 2026)
 * @param month Month of payroll (0-11, where 8 = September)
 * @param options Optional flags: capped wages (default true), optOut
 */
export function calculatePfForMonth(
  basicSalary: number,
  year: number,
  month: number,
  options?: {
    capped?: boolean; // defaults to true (statutory ceiling applied)
    optOut?: boolean; // defaults to false
  }
): PfCalculationResult {
  const capped = options?.capped !== false;
  if (options?.optOut || basicSalary <= 0) {
    return {
      basicSalary,
      epfWages: 0,
      epsWages: 0,
      edliWages: 0,
      employeePf: 0,
      employerEps: 0,
      employerEpf: 0,
      totalEmployerPf: 0,
      ceilingApplied: 0,
      isSplitMonth: false,
    };
  }

  const ceilingInfo = getPfCeilingForMonth(year, month);
  const epfWages = capped ? Math.min(basicSalary, ceilingInfo.ceiling) : basicSalary;
  // EPS and EDLI are always capped at the statutory ceiling by law
  const epsWages = Math.min(basicSalary, ceilingInfo.ceiling);
  const edliWages = Math.min(basicSalary, ceilingInfo.ceiling);

  const employeePf = capped && basicSalary >= ceilingInfo.ceiling
    ? ceilingInfo.maxEmployeePf
    : Math.round(epfWages * PF_STATUTORY_CONSTANTS.EMPLOYEE_RATE);

  const employerEps = basicSalary >= ceilingInfo.ceiling
    ? ceilingInfo.maxEmployerEps
    : Math.round(epsWages * PF_STATUTORY_CONSTANTS.EPS_RATE);

  const employerEpf = employeePf - employerEps;
  const totalEmployerPf = employerEps + employerEpf;

  return {
    basicSalary,
    epfWages,
    epsWages,
    edliWages,
    employeePf,
    employerEps,
    employerEpf,
    totalEmployerPf,
    ceilingApplied: ceilingInfo.ceiling,
    isSplitMonth: ceilingInfo.isSplitMonth,
  };
}

/**
 * Calculate PF for an effective date (used in SalaryStructure).
 * Evaluates date against statutory timelines.
 */
export function calculatePfForDate(
  basicSalary: number,
  effectiveDate: Date = new Date(),
  options?: {
    capped?: boolean;
    optOut?: boolean;
  }
): PfCalculationResult {
  const d = new Date(effectiveDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();

  // If evaluated on a specific date within September 2026:
  // - On 1-16 Sep 2026: strictly pre-revision limit applies (15k / 1800).
  // - On 17-30 Sep 2026: post-revision limit applies (25k / 3000).
  // When evaluated at a month level, getPfCeilingForMonth handles the split month.
  if (year === 2026 && month === 8) {
    const day = d.getUTCDate();
    if (day < 17) {
      return calculatePfForMonth(basicSalary, 2026, 7, options); // evaluate against August (pre-revision)
    } else {
      return calculatePfForMonth(basicSalary, 2026, 9, options); // evaluate against October (post-revision)
    }
  }

  return calculatePfForMonth(basicSalary, year, month, options);
}
