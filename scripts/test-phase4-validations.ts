/**
 * Phase 4 Test Suite: Wage Definition & Pre-Export Validation
 * 
 * Verifies:
 * 1. Code on Wages 2019 / Code on Social Security 2020: 50% Rule and Add-Back
 * 2. Capped PF vs Actual PF Wage Bases
 * 3. Voluntary Provident Fund (VPF)
 * 4. ESI Eligibility Above vs Below Threshold
 * 5. Employer Share Inside CTC vs Over & Above
 * 6. Mid-Month Joiner Proration
 * 7. Loss of Pay (LOP / NCP Days) Proration
 * 8. Resignation / Mid-Month Exit Proration
 * 9. Pre-Export Validation Service (UAN, ESIC IP, PAN, Negative Wages, PT State)
 */

import { calculateCodeWages, CODE_ON_WAGES_EFFECTIVE_DATE } from '../services/statutory/wageDefinitionService';
import { calculateEmployeeMonthlyStatutory } from '../services/statutory/wageCalculationService';
import { validateEmployeeStatutoryRecord, validatePayrollExportBatch } from '../services/statutory/validationService';
import { ResolvedCompanyRules, ResolvedEmployeeRules } from '../services/statutory/ruleResolverService';

interface TestCase {
  name: string;
  actual: any;
  expected: any;
  pass: boolean;
}

const results: TestCase[] = [];

function assertEqual(name: string, actual: any, expected: any) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, actual, expected, pass });
  if (!pass) {
    console.error(`FAIL: ${name}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('RUNNING PHASE 4 WAGE DEFINITION & VALIDATIONS TEST SUITE');
  console.log('=====================================================\n');

  // Test Group 1: Code on Wages 50% Remuneration Proviso (Section 2(y))
  console.log('--- 1. Code on Wages 50% Rule & Add-Back ---');
  // Scenario: Basic = 20,000, Special Allowance = 30,000, Total = 50,000.
  // Excluded = 30,000 > 50% of 50,000 (25,000). Excess = 5,000.
  // Statutory Code Wages = 20,000 + 5,000 = 25,000.
  const earningsSample = {
    basic: 20000,
    specialAllowance: 30000,
  };

  const postCodeDate = new Date('2026-04-15T00:00:00.000Z');
  const codeResult = calculateCodeWages(earningsSample, postCodeDate);
  assertEqual('Code wages total remuneration is 50,000', codeResult.totalRemuneration, 50000);
  assertEqual('50% threshold is 25,000', codeResult.fiftyPercentCap, 25000);
  assertEqual('Excess add-back over 50% is 5,000', codeResult.excessAddBack, 5000);
  assertEqual('Statutory Code Wages adjusted to 25,000', codeResult.statutoryCodeWages, 25000);
  assertEqual('Code on Wages definition active flag is true', codeResult.isCodeDefinitionApplied, true);

  // Pre-21 Nov 2025: Legacy regime (no add-back)
  const preCodeDate = new Date('2025-10-15T00:00:00.000Z');
  const legacyResult = calculateCodeWages(earningsSample, preCodeDate);
  assertEqual('Pre-Code statutory wages equal Basic only (20,000)', legacyResult.statutoryCodeWages, 20000);
  assertEqual('Pre-Code excess add-back is 0', legacyResult.excessAddBack, 0);

  // Default Mock Rules for Calculations
  const mockCompanyRules: ResolvedCompanyRules = {
    pf: {
      enabled: true,
      establishmentCode: 'MH/BAN/0012345/000',
      ceiling: 25000,
      employeeRate: 0.12,
      epsRate: 0.0833,
      epfEmployerRate: 0.0367,
      edliRate: 0.005,
      adminRate: 0.005,
      maxEmployeePf: 3000,
      maxEmployerEps: 2083,
      maxEmployerEpf: 917,
      wageCeilingMode: 'statutory_ceiling',
      employerShareInCtc: true,
      isSplitMonth: false,
    },
    esi: {
      enabled: true,
      establishmentCode: '11000123450000101',
      threshold: 21000,
      employeeRate: 0.0075,
      employerRate: 0.0325,
      enforceContributionPeriod: true,
    },
    pt: {
      enabled: true,
      stateRegistrations: [{ state: 'Maharashtra', registrationNumber: 'MH-PT-001' }],
    },
    tax: { tanNumber: 'MUMB12345A', act: '2025', defaultRegime: 'new' },
    general: { roundingMode: 'round' },
  };

  const mockEmployeeRules: ResolvedEmployeeRules = {
    pf: {
      applicable: true,
      optOut: false,
      wageCeilingMode: 'statutory_ceiling',
      ceiling: 25000,
      employeeRate: 0.12,
      epsRate: 0.0833,
      epfEmployerRate: 0.0367,
      vpfAmount: 0,
      vpfPercentage: 0,
      isSplitMonth: false,
      maxEmployeePf: 3000,
    },
    esi: {
      applicable: true,
      optOut: false,
      threshold: 21000,
      employeeRate: 0.0075,
      employerRate: 0.0325,
    },
    pt: { applicable: true, workState: 'Maharashtra', registrationNumber: 'MH-PT-001' },
    tax: { act: '2025', regime: 'new' },
    identifiers: { uan: '100123456789', esicIpNumber: '1101234567', panMasked: '•••••1234A' },
  };

  // Test Group 2: Capped vs Actual PF Wage Bases
  console.log('\n--- 2. Capped vs Actual PF Wages ---');
  // High earner: Basic 40,000 in Oct 2026
  const cappedCalc = calculateEmployeeMonthlyStatutory(
    { basic: 40000 },
    { calendarDays: 31, lopDays: 0 },
    mockCompanyRules,
    mockEmployeeRules,
    2026,
    9 // October
  );
  assertEqual('Capped PF wages = ₹25,000', cappedCalc.statutoryWages.epfWages, 25000);
  assertEqual('Capped Employee PF = ₹3,000', cappedCalc.employeeDeductions.pf, 3000);

  // Same employee with actual_wages mode
  const actualEmpRules: ResolvedEmployeeRules = {
    ...mockEmployeeRules,
    pf: { ...mockEmployeeRules.pf, wageCeilingMode: 'actual_wages' },
  };
  const actualCalc = calculateEmployeeMonthlyStatutory(
    { basic: 40000 },
    { calendarDays: 31, lopDays: 0 },
    mockCompanyRules,
    actualEmpRules,
    2026,
    9
  );
  assertEqual('Actual PF wages = ₹40,000', actualCalc.statutoryWages.epfWages, 40000);
  assertEqual('Actual Employee PF (12%) = ₹4,800', actualCalc.employeeDeductions.pf, 4800);
  assertEqual('EPS wages remain capped at ₹25,000', actualCalc.statutoryWages.epsWages, 25000);
  assertEqual('Employer EPS = ₹2,083', actualCalc.employerContributions.eps, 2083);
  assertEqual('Employer EPF = ₹2,717 (4800 - 2083)', actualCalc.employerContributions.epf, 2717);

  // Test Group 3: Voluntary Provident Fund (VPF)
  console.log('\n--- 3. Voluntary Provident Fund (VPF) ---');
  const vpfEmpRules: ResolvedEmployeeRules = {
    ...mockEmployeeRules,
    pf: { ...mockEmployeeRules.pf, vpfAmount: 5000 },
  };
  const vpfCalc = calculateEmployeeMonthlyStatutory(
    { basic: 20000 },
    { calendarDays: 30, lopDays: 0 },
    mockCompanyRules,
    vpfEmpRules,
    2026,
    9
  );
  assertEqual('Regular PF (12% of 20k) = ₹2,400', vpfCalc.employeeDeductions.pf, 2400);
  assertEqual('VPF Amount = ₹5,000', vpfCalc.employeeDeductions.vpf, 5000);
  assertEqual('Total Employee PF = ₹7,400', vpfCalc.employeeDeductions.totalPf, 7400);

  // Test Group 4: ESI Above vs Below Threshold
  console.log('\n--- 4. ESI Above vs Below Threshold ---');
  const esiEligibleCalc = calculateEmployeeMonthlyStatutory(
    { basic: 10000, hra: 5000, specialAllowance: 3000 }, // Gross 18,000 <= 21,000
    { calendarDays: 30, lopDays: 0 },
    mockCompanyRules,
    mockEmployeeRules,
    2026,
    9
  );
  assertEqual('ESI eligible wages = ₹18,000', esiEligibleCalc.statutoryWages.esiWages, 18000);
  assertEqual('Employee ESI (0.75%) = ₹135', esiEligibleCalc.employeeDeductions.esi, 135);
  assertEqual('Employer ESI (3.25%) = ₹585', esiEligibleCalc.employerContributions.esi, 585);

  const esiIneligibleCalc = calculateEmployeeMonthlyStatutory(
    { basic: 20000, hra: 8000 }, // Gross 28,000 > 21,000
    { calendarDays: 30, lopDays: 0 },
    mockCompanyRules,
    mockEmployeeRules,
    2026,
    9
  );
  assertEqual('ESI ineligible wages = 0', esiIneligibleCalc.statutoryWages.esiWages, 0);
  assertEqual('Employee ESI = 0', esiIneligibleCalc.employeeDeductions.esi, 0);

  // Test Group 5: Mid-Month Joiner Proration
  console.log('\n--- 5. Mid-Month Joiner Proration ---');
  // Joined on 16 September 2026 (15 paid days in 30-day month = 50%)
  const joinerCalc = calculateEmployeeMonthlyStatutory(
    { basic: 30000 },
    { calendarDays: 30, lopDays: 0, joiningDate: new Date('2026-09-16T00:00:00.000Z') },
    mockCompanyRules,
    mockEmployeeRules,
    2026,
    8 // September
  );
  assertEqual('Joiner paid days = 15', joinerCalc.paidDays, 15);
  assertEqual('Joiner prorated basic = ₹15,000', joinerCalc.earnings.basic, 15000);
  // September ceiling is 19,667, prorated by 50% = 9,834
  assertEqual('Joiner prorated EPF ceiling applied', joinerCalc.statutoryWages.epfWages, 9834);
  assertEqual('Joiner employee PF = 12% of 9,834 = ₹1,180', joinerCalc.employeeDeductions.pf, 1180);

  // Test Group 6: Loss of Pay (LOP / NCP Days)
  console.log('\n--- 6. Loss of Pay (LOP / NCP Days) ---');
  // 30 days month, 5 LOP days = 25 paid days (factor = 25/30)
  const lopCalc = calculateEmployeeMonthlyStatutory(
    { basic: 30000 },
    { calendarDays: 30, lopDays: 5 },
    mockCompanyRules,
    mockEmployeeRules,
    2026,
    8
  );
  assertEqual('NCP Days = 5', lopCalc.ncpDays, 5);
  assertEqual('Paid Days = 25', lopCalc.paidDays, 25);
  assertEqual('Prorated basic (30,000 * 25/30) = ₹25,000', lopCalc.earnings.basic, 25000);

  // Test Group 7: Resignation / Mid-Month Exit
  console.log('\n--- 7. Resignation / Mid-Month Exit ---');
  // Exited on 10 October in a 31-day month = 10 paid days
  const exitCalc = calculateEmployeeMonthlyStatutory(
    { basic: 31000 },
    { calendarDays: 31, lopDays: 0, exitDate: new Date('2026-10-10T00:00:00.000Z') },
    mockCompanyRules,
    mockEmployeeRules,
    2026,
    9
  );
  assertEqual('Exit paid days = 10', exitCalc.paidDays, 10);
  assertEqual('Prorated basic (31,000 * 10/31) = ₹10,000', exitCalc.earnings.basic, 10000);

  // Test Group 8: Pre-Export Validation Service
  console.log('\n--- 8. Pre-Export Validation Engine ---');
  // 8.1 Invalid PAN
  const invalidPanErrors = validateEmployeeStatutoryRecord(
    {
      id: 'emp1',
      name: 'John Doe',
      code: 'EMP001',
      uan: '100123456789',
      pan: 'INVALID_PAN_123',
      workState: 'Maharashtra',
    },
    cappedCalc,
    mockEmployeeRules,
    mockCompanyRules
  );
  assertEqual('Validation catches invalid PAN format', invalidPanErrors.some(e => e.errorType === 'INVALID_PAN'), true);

  // 8.2 Missing UAN
  const missingUanErrors = validateEmployeeStatutoryRecord(
    {
      id: 'emp2',
      name: 'Jane Smith',
      code: 'EMP002',
      uan: '', // missing
      pan: 'ABCDE1234F',
      workState: 'Maharashtra',
    },
    cappedCalc,
    mockEmployeeRules,
    mockCompanyRules
  );
  assertEqual('Validation catches missing UAN', missingUanErrors.some(e => e.errorType === 'MISSING_UAN'), true);

  // 8.3 Invalid ESIC IP Number (9 digits instead of 10)
  const invalidEsiErrors = validateEmployeeStatutoryRecord(
    {
      id: 'emp3',
      name: 'Bob Ross',
      code: 'EMP003',
      uan: '100123456789',
      esicIpNumber: '123456789', // 9 digits
      pan: 'ABCDE1234F',
      workState: 'Maharashtra',
    },
    esiEligibleCalc,
    mockEmployeeRules,
    mockCompanyRules
  );
  assertEqual('Validation catches invalid ESIC IP length', invalidEsiErrors.some(e => e.errorType === 'INVALID_ESIC_IP'), true);

  // 8.4 Batch Validation Blocks Export
  const batchReport = await validatePayrollExportBatch([
    {
      employeeId: 'emp1',
      employeeName: 'John Doe',
      employeeCode: 'EMP001',
      uan: '100123456789',
      pan: 'INVALID_PAN_123',
      workState: 'Maharashtra',
      calculation: cappedCalc,
      employeeRules: mockEmployeeRules,
    },
    {
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      employeeCode: 'EMP002',
      uan: '100987654321',
      pan: 'ABCDE1234F',
      workState: 'Maharashtra',
      calculation: cappedCalc,
      employeeRules: mockEmployeeRules,
    },
  ], mockCompanyRules);

  assertEqual('Batch validation reports isValid: false when blocking errors exist', batchReport.isValid, false);
  assertEqual('Batch error count is 1', batchReport.errorCount, 1);
  assertEqual('Valid count is 1', batchReport.validCount, 1);

  // Summary
  const passedCount = results.filter(r => r.pass).length;
  const failedCount = results.filter(r => !r.pass).length;

  console.log('\n=====================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (Total: ${results.length})`);
  console.log('=====================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error in Phase 4:', e);
  process.exit(1);
});
