import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import Employee from '@/models/Employee';
import User from '@/models/User';
import StatutoryRuleSnapshot from '@/models/StatutoryRuleSnapshot';
import ActivityLog from '@/models/ActivityLog';
import { getPfCeilingForMonth, PF_STATUTORY_CONSTANTS } from '@/lib/statutory/pfRules';

export interface ResolvedCompanyRules {
  pf: {
    enabled: boolean;
    establishmentCode: string;
    ceiling: number;
    employeeRate: number;
    epsRate: number;
    epfEmployerRate: number;
    edliRate: number;
    adminRate: number;
    maxEmployeePf: number;
    maxEmployerEps: number;
    maxEmployerEpf: number;
    wageCeilingMode: 'statutory_ceiling' | 'actual_wages';
    employerShareInCtc: boolean;
    isSplitMonth: boolean;
  };
  esi: {
    enabled: boolean;
    establishmentCode: string;
    threshold: number;
    employeeRate: number;
    employerRate: number;
    enforceContributionPeriod: boolean;
  };
  pt: {
    enabled: boolean;
    stateRegistrations: Array<{ state: string; registrationNumber: string; ptoCircle?: string }>;
  };
  tax: {
    tanNumber: string;
    act: '1961' | '2025';
    defaultRegime: 'new' | 'old';
  };
  general: {
    roundingMode: 'round' | 'floor';
  };
}

export interface ResolvedEmployeeRules {
  pf: {
    applicable: boolean;
    optOut: boolean;
    optOutReason?: string;
    wageCeilingMode: 'statutory_ceiling' | 'actual_wages';
    ceiling: number;
    employeeRate: number;
    epsRate: number;
    epfEmployerRate: number;
    vpfAmount: number;
    vpfPercentage: number;
    isSplitMonth: boolean;
    maxEmployeePf: number;
  };
  esi: {
    applicable: boolean;
    optOut: boolean;
    threshold: number;
    employeeRate: number;
    employerRate: number;
  };
  pt: {
    applicable: boolean;
    workState: string;
    registrationNumber?: string;
  };
  tax: {
    act: '1961' | '2025';
    regime: 'new' | 'old';
  };
  identifiers: {
    uan?: string;
    esicIpNumber?: string;
    panMasked?: string;
  };
}

/**
 * Validate that proposed Company statutory settings meet or exceed statutory minimums.
 * Throws an Error if any setting attempts to undercut statutory protections.
 */
export function validateCompanyStatutorySettings(settings: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!settings) return { valid: false, errors: ['Settings object is required'] };

  // PF Validation
  if (settings.pf?.enabled) {
    if (settings.pf.wageCeilingMode && !['statutory_ceiling', 'actual_wages'].includes(settings.pf.wageCeilingMode)) {
      errors.push('Invalid PF wageCeilingMode. Must be statutory_ceiling or actual_wages.');
    }
  }

  // ESI Validation: Company threshold cannot be lower than statutory 21,000
  if (settings.esi?.enabled) {
    if (settings.esi.threshold !== undefined && settings.esi.threshold < 21000) {
      errors.push('ESI threshold cannot be set lower than statutory minimum of ₹21,000.');
    }
  }

  // Tax Validation
  if (settings.tax?.defaultRegime && !['new', 'old'].includes(settings.tax.defaultRegime)) {
    errors.push('Default tax regime must be either "new" or "old".');
  }

  // Rounding Validation
  if (settings.general?.roundingMode && !['round', 'floor'].includes(settings.general.roundingMode)) {
    errors.push('Rounding mode must be either "round" or "floor".');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Layer 1 + Layer 2: Resolve Company-Level Effective Rules for a given wage period.
 */
export async function resolveCompanyRules(
  companyId: string,
  year: number,
  month: number
): Promise<ResolvedCompanyRules> {
  await connectDB();
  const company = await Company.findById(companyId).lean();
  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  const statutoryPfCeiling = getPfCeilingForMonth(year, month);
  const companyPf = company.statutoryConfig?.pf;
  const companyEsi = company.statutoryConfig?.esi;
  const companyPt = company.statutoryConfig?.pt;
  const companyTax = company.statutoryConfig?.tax;
  const companyGen = company.statutoryConfig?.general;

  // Determine Applicable Income-tax Act based on Financial Year (April - March)
  // FY 2026-27 starts April 2026 (month 3 of year 2026)
  const isTaxYear2026OrLater = year > 2026 || (year === 2026 && month >= 3);
  const taxAct: '1961' | '2025' = isTaxYear2026OrLater ? '2025' : '1961';

  return {
    pf: {
      enabled: companyPf?.enabled !== false,
      establishmentCode: companyPf?.establishmentCode || '',
      ceiling: statutoryPfCeiling.ceiling,
      employeeRate: PF_STATUTORY_CONSTANTS.EMPLOYEE_RATE,
      epsRate: PF_STATUTORY_CONSTANTS.EPS_RATE,
      epfEmployerRate: 0.0367, // 3.67%
      edliRate: PF_STATUTORY_CONSTANTS.EDLI_RATE,
      adminRate: PF_STATUTORY_CONSTANTS.ADMIN_RATE,
      maxEmployeePf: statutoryPfCeiling.maxEmployeePf,
      maxEmployerEps: statutoryPfCeiling.maxEmployerEps,
      maxEmployerEpf: statutoryPfCeiling.maxEmployerEpf,
      wageCeilingMode: companyPf?.wageCeilingMode || 'statutory_ceiling',
      employerShareInCtc: companyPf?.employerShareInCtc !== false,
      isSplitMonth: statutoryPfCeiling.isSplitMonth,
    },
    esi: {
      enabled: companyEsi?.enabled !== false,
      establishmentCode: companyEsi?.establishmentCode || '',
      threshold: Math.max(companyEsi?.threshold || 21000, 21000),
      employeeRate: 0.0075, // 0.75%
      employerRate: 0.0325, // 3.25%
      enforceContributionPeriod: companyEsi?.enforceContributionPeriod !== false,
    },
    pt: {
      enabled: companyPt?.enabled !== false,
      stateRegistrations: companyPt?.stateRegistrations || [],
    },
    tax: {
      tanNumber: companyTax?.tanNumber || '',
      act: taxAct,
      defaultRegime: companyTax?.defaultRegime || 'new',
    },
    general: {
      roundingMode: companyGen?.roundingMode || 'round',
    },
  };
}

/**
 * Layer 1 + Layer 2 + Layer 3: Resolve Effective Rules for a specific Employee.
 */
export async function resolveEmployeeRules(
  employeeUserId: string,
  companyId: string,
  year: number,
  month: number
): Promise<ResolvedEmployeeRules> {
  const companyRules = await resolveCompanyRules(companyId, year, month);
  const employee = await Employee.findOne({ userId: employeeUserId, companyId }).lean();
  const user = await User.findById(employeeUserId).lean();

  const pfOverride = employee?.pfOverride;
  const esiOverride = employee?.esiOverride;

  const isPfApplicable = companyRules.pf.enabled && !pfOverride?.optOut;
  const isEsiApplicable = companyRules.esi.enabled && !esiOverride?.optOut;

  const workState = employee?.workState || user?.address?.state || 'Maharashtra';
  const stateReg = companyRules.pt.stateRegistrations.find(
    (r: any) => r.state?.toLowerCase() === workState.toLowerCase()
  );

  return {
    pf: {
      applicable: isPfApplicable,
      optOut: !!pfOverride?.optOut,
      optOutReason: pfOverride?.optOutReason,
      wageCeilingMode: companyRules.pf.wageCeilingMode,
      ceiling: companyRules.pf.ceiling,
      employeeRate: companyRules.pf.employeeRate,
      epsRate: companyRules.pf.epsRate,
      epfEmployerRate: companyRules.pf.epfEmployerRate,
      vpfAmount: pfOverride?.vpfAmount || 0,
      vpfPercentage: pfOverride?.vpfPercentage || 0,
      isSplitMonth: companyRules.pf.isSplitMonth,
      maxEmployeePf: companyRules.pf.maxEmployeePf,
    },
    esi: {
      applicable: isEsiApplicable,
      optOut: !!esiOverride?.optOut,
      threshold: companyRules.esi.threshold,
      employeeRate: companyRules.esi.employeeRate,
      employerRate: companyRules.esi.employerRate,
    },
    pt: {
      applicable: companyRules.pt.enabled,
      workState,
      registrationNumber: stateReg?.registrationNumber,
    },
    tax: {
      act: companyRules.tax.act,
      regime: employee?.taxRegime || companyRules.tax.defaultRegime,
    },
    identifiers: {
      uan: employee?.uan,
      esicIpNumber: employee?.esicIpNumber,
      panMasked: employee?.panMasked,
    },
  };
}

/**
 * Create or Fetch an Immutable Statutory Rule Snapshot for a payroll month.
 */
export async function createOrGetSnapshot(
  companyId: string,
  year: number,
  month: number,
  userId?: string
): Promise<any> {
  await connectDB();

  const existing = await StatutoryRuleSnapshot.findOne({ companyId, year, month });
  if (existing) {
    return existing;
  }

  const resolved = await resolveCompanyRules(companyId, year, month);
  const effectiveDate = new Date(Date.UTC(year, month, 1));
  const checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(resolved))
    .digest('hex');

  const snapshot = await StatutoryRuleSnapshot.create({
    companyId,
    month,
    year,
    effectiveDate,
    resolvedRules: resolved,
    checksum,
    isLocked: true,
    createdBy: userId,
  });

  return snapshot;
}

/**
 * Preview the Financial & Compliance Impact of proposed company statutory changes.
 */
export async function simulateStatutoryImpact(
  companyId: string,
  proposedSettings: any,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth()
): Promise<{
  employeeCount: number;
  totalNetPayCurrent: number;
  totalNetPayProposed: number;
  netPayDifference: number;
  totalEmployerLiabilityCurrent: number;
  totalEmployerLiabilityProposed: number;
  employerLiabilityDifference: number;
  affectedEmployees: Array<{
    name: string;
    basicSalary: number;
    currentPf: number;
    proposedPf: number;
    currentEsi: number;
    proposedEsi: number;
  }>;
}> {
  await connectDB();
  const users = await User.find({ companyId, isActive: true }).lean();
  const currentRules = await resolveCompanyRules(companyId, year, month);

  const statutoryPfCeiling = getPfCeilingForMonth(year, month);
  const proposedPfCeilingMode = proposedSettings.pf?.wageCeilingMode || currentRules.pf.wageCeilingMode;
  const proposedEsiThreshold = proposedSettings.esi?.threshold || currentRules.esi.threshold;

  let totalNetPayCurrent = 0;
  let totalNetPayProposed = 0;
  let totalEmployerLiabilityCurrent = 0;
  let totalEmployerLiabilityProposed = 0;
  const affectedEmployees: any[] = [];

  for (const u of users) {
    const basic = u.salary ? Math.round(u.salary * 0.5) : 0; // standard approx if not configured
    if (basic <= 0) continue;

    // Current calculations
    const currentPfCap = currentRules.pf.wageCeilingMode === 'statutory_ceiling'
      ? Math.min(basic, currentRules.pf.ceiling)
      : basic;
    const currentEmployeePf = Math.round(currentPfCap * 0.12);
    const currentEmployerEps = Math.round(Math.min(basic, currentRules.pf.ceiling) * 0.0833);
    const currentEmployerEpf = currentEmployeePf - currentEmployerEps;

    const currentEsiWages = u.salary || basic;
    const currentEmployeeEsi = currentEsiWages <= currentRules.esi.threshold ? Math.round(currentEsiWages * 0.0075) : 0;
    const currentEmployerEsi = currentEsiWages <= currentRules.esi.threshold ? Math.round(currentEsiWages * 0.0325) : 0;

    // Proposed calculations
    const proposedPfCap = proposedPfCeilingMode === 'statutory_ceiling'
      ? Math.min(basic, statutoryPfCeiling.ceiling)
      : basic;
    const proposedEmployeePf = Math.round(proposedPfCap * 0.12);
    const proposedEmployerEps = Math.round(Math.min(basic, statutoryPfCeiling.ceiling) * 0.0833);
    const proposedEmployerEpf = proposedEmployeePf - proposedEmployerEps;

    const proposedEmployeeEsi = currentEsiWages <= proposedEsiThreshold ? Math.round(currentEsiWages * 0.0075) : 0;
    const proposedEmployerEsi = currentEsiWages <= proposedEsiThreshold ? Math.round(currentEsiWages * 0.0325) : 0;

    const currentNet = (u.salary || 0) - currentEmployeePf - currentEmployeeEsi;
    const proposedNet = (u.salary || 0) - proposedEmployeePf - proposedEmployeeEsi;

    totalNetPayCurrent += currentNet;
    totalNetPayProposed += proposedNet;
    totalEmployerLiabilityCurrent += currentEmployerEps + currentEmployerEpf + currentEmployerEsi;
    totalEmployerLiabilityProposed += proposedEmployerEps + proposedEmployerEpf + proposedEmployerEsi;

    if (currentEmployeePf !== proposedEmployeePf || currentEmployeeEsi !== proposedEmployeeEsi) {
      affectedEmployees.push({
        name: u.name,
        basicSalary: basic,
        currentPf: currentEmployeePf,
        proposedPf: proposedEmployeePf,
        currentEsi: currentEmployeeEsi,
        proposedEsi: proposedEmployeeEsi,
      });
    }
  }

  return {
    employeeCount: users.length,
    totalNetPayCurrent,
    totalNetPayProposed,
    netPayDifference: totalNetPayProposed - totalNetPayCurrent,
    totalEmployerLiabilityCurrent,
    totalEmployerLiabilityProposed,
    employerLiabilityDifference: totalEmployerLiabilityProposed - totalEmployerLiabilityCurrent,
    affectedEmployees,
  };
}
