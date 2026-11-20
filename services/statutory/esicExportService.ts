/**
 * ESIC (Employees' State Insurance Corporation) Monthly Contribution Export Service
 * 
 * Legal & Portal Specifications:
 * - ESI (Central) Rules, 1950 (Rule 50) & ESI (General) Regulations, 1950 (Reg 31)
 * - ESIC Employer Portal Sample Monthly Contribution (MC) format
 * - 6 Mandatory Columns in exact order:
 *   A. IP Number (10 digits)
 *   B. IP Name (letters and spaces only)
 *   C. No. of Days for which wages paid/payable (whole numbers 0-31)
 *   D. Total Monthly Wages (numeric)
 *   E. Reason Code for Zero Working Days (0 = None/worked; 1 = On Leave; 2 = Left Service; 3 = Retired; 4 = Out of Coverage; 5 = Expired)
 *   F. Last Working Day (DD/MM/YYYY; required only for specific exit reason codes; otherwise empty)
 */

import { DetailedWageCalculationResult } from './wageCalculationService';
import { ResolvedCompanyRules, ResolvedEmployeeRules } from './ruleResolverService';
import { validatePayrollExportBatch, ValidationReport } from './validationService';

export interface EsicMemberInput {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  esicIpNumber: string;
  uan?: string;
  pan?: string;
  workState?: string;
  lastWorkingDay?: Date;
  exitReasonCode?: number; // 0=worked, 1=leave, 2=left service, etc.
  calculation: DetailedWageCalculationResult;
  employeeRules: ResolvedEmployeeRules;
}

export interface EsicExportResult {
  fileName: string;
  csvContent: string;
  memberCount: number;
  totals: {
    totalWages: number;
    totalPaidDays: number;
    employeeShare: number; // 0.75%
    employerShare: number; // 3.25%
    totalContribution: number; // 4.00%
  };
  validationReport: ValidationReport;
}

/**
 * Format employee name for ESIC (letters and spaces only).
 */
export function formatEsicMemberName(name: string): string {
  if (!name) return 'UNKNOWN';
  return name
    .trim()
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Format date as DD/MM/YYYY for ESIC portal.
 */
export function formatEsicDate(date?: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Generate official ESIC Monthly Contribution CSV/Excel File Content.
 */
export async function generateEsicContributionFile(
  members: EsicMemberInput[],
  companyRules: ResolvedCompanyRules,
  year: number,
  month: number // 0-indexed
): Promise<EsicExportResult> {
  // Pre-export validation check
  const validationReport = await validatePayrollExportBatch(members, companyRules);
  if (!validationReport.isValid) {
    throw new Error(
      `ESIC Export Blocked: ${validationReport.errorCount} blocking validation error(s) found. Fix employee records before exporting.`
    );
  }

  // Official ESIC Template Header Row
  const headers = [
    'IP Number',
    'IP Name',
    'No. of Days for which wages paid/payable',
    'Total Monthly Wages',
    'Reason Code for Zero Working Days',
    'Last Working Day',
  ];

  const rows: string[] = [headers.join(',')];
  const totals = {
    totalWages: 0,
    totalPaidDays: 0,
    employeeShare: 0,
    employerShare: 0,
    totalContribution: 0,
  };

  for (const member of members) {
    if (!member.employeeRules.esi.applicable) continue;

    const calc = member.calculation;
    const ipNumber = (member.esicIpNumber || '').trim();
    const name = formatEsicMemberName(member.employeeName);
    const paidDays = Math.max(0, Math.min(31, Math.ceil(calc.paidDays)));
    const totalWages = Math.round(calc.statutoryWages.esiWages);

    // Reason code for zero working days
    let reasonCode = 0;
    let lastWorkingDayFormatted = '';

    if (paidDays === 0 || totalWages === 0) {
      reasonCode = member.exitReasonCode !== undefined ? member.exitReasonCode : 1; // 1 = On Leave
      if ([2, 3, 4, 5, 6, 10].includes(reasonCode) && member.lastWorkingDay) {
        lastWorkingDayFormatted = formatEsicDate(member.lastWorkingDay);
      }
    }

    const row = [
      `"${ipNumber}"`, // wrap in quotes to preserve leading zeroes in Excel
      `"${name}"`,
      paidDays,
      totalWages,
      reasonCode,
      lastWorkingDayFormatted ? `"${lastWorkingDayFormatted}"` : '',
    ].join(',');

    rows.push(row);

    const empShare = Math.round(totalWages * 0.0075);
    const emplyrShare = Math.round(totalWages * 0.0325);

    totals.totalWages += totalWages;
    totals.totalPaidDays += paidDays;
    totals.employeeShare += empShare;
    totals.employerShare += emplyrShare;
    totals.totalContribution += empShare + emplyrShare;
  }

  const csvContent = rows.join('\r\n');
  const monthPadded = String(month + 1).padStart(2, '0');
  const estCodeSafe = (companyRules.esi.establishmentCode || 'ESIC').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `ESIC_MC_${estCodeSafe}_${year}${monthPadded}.csv`;

  return {
    fileName,
    csvContent,
    memberCount: rows.length - 1,
    totals,
    validationReport,
  };
}
