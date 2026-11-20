/**
 * EPFO ECR (Electronic Challan cum Return) Export Service
 * 
 * Legal & Portal Specifications:
 * - EPF Scheme, 2026 (Notification G.S.R. 525(E)) / EPF Scheme, 1952 (Para 38)
 * - EPFO Unified Portal ECR 2.0 / 3.0 specification
 * - File format: Plain text (.txt), ASCII/UTF-8, delimiter #~#
 * - Strict 11 columns in exact sequence:
 *   1. UAN (12 digits)
 *   2. Member Name (as per Aadhaar/EPFO records)
 *   3. Gross Wages (integer)
 *   4. EPF Wages (capped or actual)
 *   5. EPS Wages (capped at statutory ceiling)
 *   6. EDLI Wages (capped at statutory ceiling)
 *   7. EPF Contribution - Employee Share (12%)
 *   8. EPS Contribution - Employer Share (8.33% capped)
 *   9. EPF-EPS Difference - Employer Share (3.67% or diff)
 *   10. NCP Days (Non-Contributory Period / LOP days)
 *   11. Refund of Advances (0 if none)
 */

import { DetailedWageCalculationResult } from './wageCalculationService';
import { ResolvedCompanyRules, ResolvedEmployeeRules } from './ruleResolverService';
import { validatePayrollExportBatch, ValidationReport } from './validationService';

export interface EcrMemberInput {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  uan: string;
  pan?: string;
  esicIpNumber?: string;
  workState?: string;
  calculation: DetailedWageCalculationResult;
  employeeRules: ResolvedEmployeeRules;
}

export interface EcrExportResult {
  fileName: string;
  fileContent: string;
  memberCount: number;
  totals: {
    grossWages: number;
    epfWages: number;
    epsWages: number;
    edliWages: number;
    employeePf: number;
    employerEps: number;
    employerEpf: number;
    totalPfDeduction: number;
    ncpDays: number;
  };
  validationReport: ValidationReport;
}

/**
 * Format employee name according to EPFO guidelines:
 * Uppercase, letters and spaces only, no special characters or honorifics.
 */
export function formatEpfoMemberName(name: string): string {
  if (!name) return 'UNKNOWN';
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Generate official EPFO ECR Text File Content.
 */
export async function generateEpfoEcrFile(
  members: EcrMemberInput[],
  companyRules: ResolvedCompanyRules,
  year: number,
  month: number // 0-indexed
): Promise<EcrExportResult> {
  // Pre-export validation check: never export partial files silently
  const validationReport = await validatePayrollExportBatch(members, companyRules);
  if (!validationReport.isValid) {
    throw new Error(
      `ECR Export Blocked: ${validationReport.errorCount} blocking validation error(s) found. Fix employee records before exporting.`
    );
  }

  const lines: string[] = [];
  const totals = {
    grossWages: 0,
    epfWages: 0,
    epsWages: 0,
    edliWages: 0,
    employeePf: 0,
    employerEps: 0,
    employerEpf: 0,
    totalPfDeduction: 0,
    ncpDays: 0,
  };

  for (const member of members) {
    // Only employees covered under PF are reported in ECR
    if (!member.employeeRules.pf.applicable) continue;

    const calc = member.calculation;
    const uan = (member.uan || '').trim();
    const name = formatEpfoMemberName(member.employeeName);
    const grossWages = Math.round(calc.earnings.grossEarnings);
    const epfWages = Math.round(calc.statutoryWages.epfWages);
    const epsWages = Math.round(calc.statutoryWages.epsWages);
    const edliWages = Math.round(calc.statutoryWages.edliWages);
    const employeePf = Math.round(calc.employeeDeductions.pf);
    const employerEps = Math.round(calc.employerContributions.eps);
    const employerEpf = Math.round(calc.employerContributions.epf);
    const ncpDays = Math.max(0, Math.min(31, Math.round(calc.ncpDays || 0)));
    const refundOfAdvances = 0;

    // Col 1: UAN
    // Col 2: Member Name
    // Col 3: Gross Wages
    // Col 4: EPF Wages
    // Col 5: EPS Wages
    // Col 6: EDLI Wages
    // Col 7: EPF Contribution (Employee Share)
    // Col 8: EPS Contribution (Employer Share)
    // Col 9: EPF-EPS Difference (Employer Share)
    // Col 10: NCP Days
    // Col 11: Refund of Advances
    const row = [
      uan,
      name,
      grossWages,
      epfWages,
      epsWages,
      edliWages,
      employeePf,
      employerEps,
      employerEpf,
      ncpDays,
      refundOfAdvances,
    ].join('#~#');

    lines.push(row);

    totals.grossWages += grossWages;
    totals.epfWages += epfWages;
    totals.epsWages += epsWages;
    totals.edliWages += edliWages;
    totals.employeePf += employeePf;
    totals.employerEps += employerEps;
    totals.employerEpf += employerEpf;
    totals.totalPfDeduction += employeePf + employerEps + employerEpf;
    totals.ncpDays += ncpDays;
  }

  // File content joined by CRLF, no trailing blank line
  const fileContent = lines.join('\r\n');
  const monthPadded = String(month + 1).padStart(2, '0');
  const estCodeSafe = (companyRules.pf.establishmentCode || 'EST').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `ECR_${estCodeSafe}_${year}${monthPadded}.txt`;

  return {
    fileName,
    fileContent,
    memberCount: lines.length,
    totals,
    validationReport,
  };
}
