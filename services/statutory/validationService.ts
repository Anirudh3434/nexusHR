import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import User from '@/models/User';
import { ResolvedCompanyRules, ResolvedEmployeeRules, resolveEmployeeRules } from './ruleResolverService';
import { DetailedWageCalculationResult } from './wageCalculationService';

export interface ValidationError {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  field: string;
  errorType: 
    | 'MISSING_UAN'
    | 'INVALID_UAN'
    | 'MISSING_ESIC_IP'
    | 'INVALID_ESIC_IP'
    | 'MISSING_PAN'
    | 'INVALID_PAN'
    | 'NEGATIVE_WAGES'
    | 'MISSING_WORK_STATE'
    | 'UNREGISTERED_PT_STATE'
    | 'WAGE_BASE_MISMATCH'
    | 'ZERO_DAYS_NO_REASON';
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  isValid: boolean;
  totalEvaluated: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
  errors: ValidationError[];
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const UAN_REGEX = /^[1-9][0-9]{11}$/; // 12 digits, cannot start with 0
const ESIC_IP_REGEX = /^[0-9]{10}$/; // 10 digits

/**
 * Validate an individual employee record and wage calculation for statutory compliance.
 */
export function validateEmployeeStatutoryRecord(
  employee: {
    id: string;
    name: string;
    code: string;
    uan?: string;
    esicIpNumber?: string;
    pan?: string;
    workState?: string;
  },
  calculation: DetailedWageCalculationResult,
  rules: ResolvedEmployeeRules,
  companyRules: ResolvedCompanyRules
): ValidationError[] {
  const errors: ValidationError[] = [];

  const empId = employee.id;
  const name = employee.name;
  const code = employee.code;

  // 1. Negative Wages Check
  if (calculation.earnings.grossEarnings < 0 || calculation.netPay < 0 || calculation.earnings.basic < 0) {
    errors.push({
      employeeId: empId,
      employeeName: name,
      employeeCode: code,
      field: 'grossEarnings',
      errorType: 'NEGATIVE_WAGES',
      message: `Negative earnings detected (Gross: ₹${calculation.earnings.grossEarnings}, Net: ₹${calculation.netPay}). Statutory files cannot accept negative values.`,
      severity: 'error',
    });
  }

  // 2. Wage Base Mismatch
  if (calculation.statutoryWages.epfWages > calculation.earnings.grossEarnings) {
    errors.push({
      employeeId: empId,
      employeeName: name,
      employeeCode: code,
      field: 'epfWages',
      errorType: 'WAGE_BASE_MISMATCH',
      message: `EPF wages (₹${calculation.statutoryWages.epfWages}) exceed Gross Earnings (₹${calculation.earnings.grossEarnings}).`,
      severity: 'error',
    });
  }

  if (calculation.statutoryWages.epsWages > calculation.statutoryWages.epfWages) {
    errors.push({
      employeeId: empId,
      employeeName: name,
      employeeCode: code,
      field: 'epsWages',
      errorType: 'WAGE_BASE_MISMATCH',
      message: `EPS wages (₹${calculation.statutoryWages.epsWages}) cannot exceed EPF wages (₹${calculation.statutoryWages.epfWages}).`,
      severity: 'error',
    });
  }

  // 3. PF / UAN Validation
  if (rules.pf.applicable) {
    if (!employee.uan || employee.uan.trim() === '') {
      errors.push({
        employeeId: empId,
        employeeName: name,
        employeeCode: code,
        field: 'uan',
        errorType: 'MISSING_UAN',
        message: 'EPFO UAN is missing for PF-contributing employee. ECR upload will fail.',
        severity: 'error',
      });
    } else if (!UAN_REGEX.test(employee.uan.trim())) {
      errors.push({
        employeeId: empId,
        employeeName: name,
        employeeCode: code,
        field: 'uan',
        errorType: 'INVALID_UAN',
        message: `UAN "${employee.uan}" must be exactly 12 numeric digits and cannot start with 0.`,
        severity: 'error',
      });
    }
  }

  // 4. ESI / IP Number Validation
  if (rules.esi.applicable && calculation.statutoryWages.esiWages > 0) {
    if (!employee.esicIpNumber || employee.esicIpNumber.trim() === '') {
      errors.push({
        employeeId: empId,
        employeeName: name,
        employeeCode: code,
        field: 'esicIpNumber',
        errorType: 'MISSING_ESIC_IP',
        message: 'ESIC IP Number is missing for ESI-covered employee. ESIC upload will fail.',
        severity: 'error',
      });
    } else if (!ESIC_IP_REGEX.test(employee.esicIpNumber.trim())) {
      errors.push({
        employeeId: empId,
        employeeName: name,
        employeeCode: code,
        field: 'esicIpNumber',
        errorType: 'INVALID_ESIC_IP',
        message: `ESIC IP Number "${employee.esicIpNumber}" must be exactly 10 digits.`,
        severity: 'error',
      });
    }
  }

  // 5. PAN Validation (Income Tax / Form 138 / TRACES)
  if (!employee.pan || employee.pan.trim() === '') {
    errors.push({
      employeeId: empId,
      employeeName: name,
      employeeCode: code,
      field: 'pan',
      errorType: 'MISSING_PAN',
      message: 'PAN is missing. Income-tax return (Form 138 / 24Q) requires a valid PAN.',
      severity: 'error',
    });
  } else if (!PAN_REGEX.test(employee.pan.trim().toUpperCase())) {
    errors.push({
      employeeId: empId,
      employeeName: name,
      employeeCode: code,
      field: 'pan',
      errorType: 'INVALID_PAN',
      message: `Invalid PAN format: "${employee.pan}". Must match 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).`,
      severity: 'error',
    });
  }

  // 6. Work State / Professional Tax Validation
  if (rules.pt.applicable) {
    if (!employee.workState || employee.workState.trim() === '') {
      errors.push({
        employeeId: empId,
        employeeName: name,
        employeeCode: code,
        field: 'workState',
        errorType: 'MISSING_WORK_STATE',
        message: 'Work state is missing. Professional Tax state deduction cannot be determined.',
        severity: 'error',
      });
    } else {
      const state = employee.workState.trim().toLowerCase();
      const ptStates = ['maharashtra', 'karnataka', 'telangana', 'andhra pradesh', 'gujarat', 'west bengal'];
      if (ptStates.includes(state)) {
        const isRegistered = companyRules.pt.stateRegistrations.some(
          r => r.state?.toLowerCase() === state && r.registrationNumber?.trim() !== ''
        );
        if (!isRegistered) {
          errors.push({
            employeeId: empId,
            employeeName: name,
            employeeCode: code,
            field: 'workState',
            errorType: 'UNREGISTERED_PT_STATE',
            message: `Employee is posted in ${employee.workState}, but the company has no PT registration number configured for this state.`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Pre-export validation service for a batch of payroll records.
 * Ensures no invalid or corrupt records are exported into official government return files.
 */
export async function validatePayrollExportBatch(
  records: Array<{
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    uan?: string;
    esicIpNumber?: string;
    pan?: string;
    workState?: string;
    calculation: DetailedWageCalculationResult;
    employeeRules: ResolvedEmployeeRules;
  }>,
  companyRules: ResolvedCompanyRules
): Promise<ValidationReport> {
  const allErrors: ValidationError[] = [];

  for (const record of records) {
    const itemErrors = validateEmployeeStatutoryRecord(
      {
        id: record.employeeId,
        name: record.employeeName,
        code: record.employeeCode,
        uan: record.uan,
        esicIpNumber: record.esicIpNumber,
        pan: record.pan,
        workState: record.workState,
      },
      record.calculation,
      record.employeeRules,
      companyRules
    );
    allErrors.push(...itemErrors);
  }

  const blockingErrors = allErrors.filter(e => e.severity === 'error');
  const warningErrors = allErrors.filter(e => e.severity === 'warning');

  return {
    isValid: blockingErrors.length === 0,
    totalEvaluated: records.length,
    validCount: records.length - new Set(blockingErrors.map(e => e.employeeId)).size,
    errorCount: blockingErrors.length,
    warningCount: warningErrors.length,
    errors: allErrors,
  };
}
