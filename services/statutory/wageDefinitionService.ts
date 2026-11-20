/**
 * Indian Statutory Wage Definition Service
 * 
 * Legal References:
 * - Code on Wages, 2019 (Section 2(y))
 * - Code on Social Security, 2020 (Section 2(88))
 * - Ministry of Labour & Employment Notification S.O. 5322(E) dated 21 November 2025 (Effective date: 21 Nov 2025)
 * 
 * Rule:
 * - Wages = Basic + Dearness Allowance (DA) + Retaining Allowance
 * - Excluded Allowances = HRA, Conveyance, Overtime, House accommodation, Statutory Bonus, Commissions, Gratuity, Special Allowances, etc.
 * - 50% Proviso: If Excluded Allowances > 50% of Total Remuneration, the excess amount is added back to Wages for PF & ESI.
 */

export const CODE_ON_WAGES_EFFECTIVE_DATE = new Date('2025-11-21T00:00:00.000Z');

export interface EarningsBreakdown {
  basic: number;
  da?: number;
  retainingAllowance?: number;
  hra?: number;
  conveyance?: number;
  medical?: number;
  specialAllowance?: number;
  overtimePay?: number;
  bonus?: number;
  otherEarnings?: number;
}

export interface WageDefinitionResult {
  totalRemuneration: number;
  coreWages: number; // Basic + DA + Retaining
  excludedAllowances: number; // HRA + Conveyance + Special + etc.
  fiftyPercentCap: number; // 50% of Total Remuneration
  excessAddBack: number; // Max(0, excluded - 50% cap)
  statutoryCodeWages: number; // Core wages + excess add-back
  isCodeDefinitionApplied: boolean;
  effectiveDate: Date;
}

/**
 * Compute statutory wages per Section 2(y) of Code on Wages, 2019.
 * 
 * @param earnings Breakdown of monthly earnings components
 * @param date Effective date of the wage cycle (determines whether Code on Wages applies)
 */
export function calculateCodeWages(
  earnings: EarningsBreakdown,
  date: Date = new Date()
): WageDefinitionResult {
  const effectiveDate = new Date(date);
  const basic = Math.max(0, earnings.basic || 0);
  const da = Math.max(0, earnings.da || 0);
  const retaining = Math.max(0, earnings.retainingAllowance || 0);

  const coreWages = basic + da + retaining;

  const hra = Math.max(0, earnings.hra || 0);
  const conveyance = Math.max(0, earnings.conveyance || 0);
  const medical = Math.max(0, earnings.medical || 0);
  const special = Math.max(0, earnings.specialAllowance || 0);
  const overtime = Math.max(0, earnings.overtimePay || 0);
  const bonus = Math.max(0, earnings.bonus || 0);
  const other = Math.max(0, earnings.otherEarnings || 0);

  const excludedAllowances = hra + conveyance + medical + special + overtime + bonus + other;
  const totalRemuneration = coreWages + excludedAllowances;

  // Check if Code on Wages is in effect for this wage period (from 21 Nov 2025)
  const isCodeActive = effectiveDate >= CODE_ON_WAGES_EFFECTIVE_DATE;

  if (!isCodeActive || totalRemuneration <= 0) {
    // Legacy regime: Wages = Basic + DA only
    return {
      totalRemuneration,
      coreWages,
      excludedAllowances,
      fiftyPercentCap: totalRemuneration * 0.5,
      excessAddBack: 0,
      statutoryCodeWages: coreWages,
      isCodeDefinitionApplied: false,
      effectiveDate,
    };
  }

  // Code on Wages regime: 50% rule
  const fiftyPercentCap = totalRemuneration * 0.5;
  const excessAddBack = Math.max(0, excludedAllowances - fiftyPercentCap);
  const statutoryCodeWages = coreWages + excessAddBack;

  return {
    totalRemuneration,
    coreWages,
    excludedAllowances,
    fiftyPercentCap,
    excessAddBack,
    statutoryCodeWages,
    isCodeDefinitionApplied: true,
    effectiveDate,
  };
}
