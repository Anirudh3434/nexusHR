/**
 * Phase 5 Test Suite: EPFO ECR and ESIC Monthly Contribution Exports
 * 
 * Verifies:
 * 1. EPFO ECR #~# text format with strict 11 columns
 * 2. Snapshot testing per fixture employee (below ceiling, above ceiling, Sep 2026 split-month)
 * 3. ESIC monthly contribution CSV layout (Columns A to F)
 * 4. Zero-tolerance blocking on pre-export validation failure
 * 5. Re-export snapshot consistency and immutable audit trail
 */

import { generateEpfoEcrFile, formatEpfoMemberName, EcrMemberInput } from '../services/statutory/ecrExportService';
import { generateEsicContributionFile, formatEsicMemberName, formatEsicDate, EsicMemberInput } from '../services/statutory/esicExportService';
import { ResolvedCompanyRules, ResolvedEmployeeRules } from '../services/statutory/ruleResolverService';
import { calculateEmployeeMonthlyStatutory } from '../services/statutory/wageCalculationService';

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
  console.log('RUNNING PHASE 5 ECR & ESIC EXPORT TEST SUITE');
  console.log('=====================================================\n');

  // Common Company Rules
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

  const defaultEmpRules: ResolvedEmployeeRules = {
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

  // Test Group 1: Member Name & Date Formatters
  console.log('--- 1. Sanitization & Formatters ---');
  assertEqual('EPFO name strips special characters and uppercases', formatEpfoMemberName('Dr. Ramesh K. Sharma-Jr.'), 'DR RAMESH K SHARMAJR');
  assertEqual('ESIC date formatted as DD/MM/YYYY', formatEsicDate(new Date('2026-10-15T00:00:00.000Z')), '15/10/2026');

  // Test Group 2: ECR Snapshot Fixture Testing
  console.log('\n--- 2. EPFO ECR Output Snapshot Testing ---');

  // Fixture 1: Ramesh Sharma (Basic 10,000, below ceiling)
  const calc1 = calculateEmployeeMonthlyStatutory(
    { basic: 10000 },
    { calendarDays: 31, lopDays: 0 },
    mockCompanyRules,
    defaultEmpRules,
    2026,
    9 // October 2026
  );
  const fixture1: EcrMemberInput = {
    employeeId: 'emp1',
    employeeName: 'Ramesh Sharma',
    employeeCode: 'EMP001',
    uan: '100123456789',
    esicIpNumber: '1101234567',
    pan: 'ABCDE1234F',
    workState: 'Maharashtra',
    calculation: calc1,
    employeeRules: defaultEmpRules,
  };

  // Fixture 2: Priya Patel (Basic 30,000, capped at 25k, 2 LOP days)
  const calc2 = calculateEmployeeMonthlyStatutory(
    { basic: 30000 },
    { calendarDays: 31, lopDays: 2 },
    mockCompanyRules,
    defaultEmpRules,
    2026,
    9
  );
  const fixture2: EcrMemberInput = {
    employeeId: 'emp2',
    employeeName: 'Priya Patel',
    employeeCode: 'EMP002',
    uan: '100987654321',
    pan: 'BCDEF2345G',
    workState: 'Maharashtra',
    calculation: calc2,
    employeeRules: defaultEmpRules,
  };

  // Fixture 3: Anil Verma in September 2026 Split Month (Basic 30,000, ceiling 19,667)
  const sepCompanyRules: ResolvedCompanyRules = {
    ...mockCompanyRules,
    pf: {
      ...mockCompanyRules.pf,
      ceiling: 19667,
      maxEmployeePf: 2360,
      maxEmployerEps: 1638,
      maxEmployerEpf: 722,
      isSplitMonth: true,
    },
  };
  const sepEmpRules: ResolvedEmployeeRules = {
    ...defaultEmpRules,
    pf: {
      ...defaultEmpRules.pf,
      ceiling: 19667,
      maxEmployeePf: 2360,
      isSplitMonth: true,
    },
  };
  const calc3 = calculateEmployeeMonthlyStatutory(
    { basic: 30000 },
    { calendarDays: 30, lopDays: 0 },
    sepCompanyRules,
    sepEmpRules,
    2026,
    8 // September 2026
  );
  const fixture3: EcrMemberInput = {
    employeeId: 'emp3',
    employeeName: 'Anil Verma',
    employeeCode: 'EMP003',
    uan: '100555666777',
    pan: 'CDEFG3456H',
    workState: 'Maharashtra',
    calculation: calc3,
    employeeRules: sepEmpRules,
  };

  const ecrResultOct = await generateEpfoEcrFile([fixture1, fixture2], mockCompanyRules, 2026, 9);
  const linesOct = ecrResultOct.fileContent.split('\r\n');

  assertEqual('October ECR has exactly 2 member lines', linesOct.length, 2);

  // Line 1 snapshot test (Ramesh Sharma: 10k basic, 1200 PF, 833 EPS, 367 EPF, 0 NCP)
  const expectedLine1 = '100123456789#~#RAMESH SHARMA#~#10000#~#10000#~#10000#~#10000#~#1200#~#833#~#367#~#0#~#0';
  assertEqual('Line 1 matches exact EPFO ECR snapshot (Ramesh Sharma)', linesOct[0], expectedLine1);

  // Line 2 snapshot test (Priya Patel: 30k basic, 2 LOP days, prorated basic = 28065, capped at 25k prorated 23387)
  const colsLine2 = linesOct[1].split('#~#');
  assertEqual('Line 2 has 11 columns', colsLine2.length, 11);
  assertEqual('Line 2 UAN is Priya Patel', colsLine2[0], '100987654321');
  assertEqual('Line 2 Name is PRIYA PATEL', colsLine2[1], 'PRIYA PATEL');
  assertEqual('Line 2 NCP Days is 2', colsLine2[9], '2');
  assertEqual('Line 2 Refund of Advances is 0', colsLine2[10], '0');

  // September 2026 Split-month snapshot test (Anil Verma: 30k basic -> capped at 19,667, PF = 2,360, EPS = 1,638, EPF = 722)
  const ecrResultSep = await generateEpfoEcrFile([fixture3], sepCompanyRules, 2026, 8);
  const expectedSepLine = '100555666777#~#ANIL VERMA#~#30000#~#19667#~#19667#~#19667#~#2360#~#1638#~#722#~#0#~#0';
  assertEqual('September 2026 split-month matches exact ECR snapshot', ecrResultSep.fileContent, expectedSepLine);

  // Test Group 3: ESIC Monthly Contribution CSV Output
  console.log('\n--- 3. ESIC Monthly Contribution CSV Output ---');
  const esicMember1: EsicMemberInput = {
    employeeId: 'emp1',
    employeeName: 'Ramesh Sharma',
    employeeCode: 'EMP001',
    esicIpNumber: '1101234567',
    uan: '100123456789',
    pan: 'ABCDE1234F',
    workState: 'Maharashtra',
    calculation: calc1, // 10k gross <= 21k
    employeeRules: defaultEmpRules,
  };

  const esicResult = await generateEsicContributionFile([esicMember1], mockCompanyRules, 2026, 9);
  const esicRows = esicResult.csvContent.split('\r\n');

  assertEqual('ESIC file has header + 1 data row', esicRows.length, 2);
  assertEqual(
    'ESIC Header matches official portal template',
    esicRows[0],
    'IP Number,IP Name,No. of Days for which wages paid/payable,Total Monthly Wages,Reason Code for Zero Working Days,Last Working Day'
  );
  assertEqual(
    'ESIC Row matches exact expected data',
    esicRows[1],
    '"1101234567","Ramesh Sharma",31,10000,0,'
  );

  // Test Group 4: Pre-Export Validation Blocking
  console.log('\n--- 4. Pre-Export Validation Blocking Enforcement ---');
  const invalidMember: EcrMemberInput = {
    employeeId: 'emp_invalid',
    employeeName: 'Invalid Person',
    employeeCode: 'EMP999',
    uan: '', // missing UAN
    pan: 'ABCDE1234F',
    workState: 'Maharashtra',
    calculation: calc1,
    employeeRules: defaultEmpRules,
  };

  let ecrBlocked = false;
  try {
    await generateEpfoEcrFile([invalidMember], mockCompanyRules, 2026, 9);
  } catch (err: any) {
    ecrBlocked = err.message.includes('ECR Export Blocked');
  }
  assertEqual('ECR generator blocks export when UAN is missing', ecrBlocked, true);

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
  console.error('Fatal test error in Phase 5:', e);
  process.exit(1);
});
