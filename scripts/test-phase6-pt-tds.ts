/**
 * Phase 6 Test Suite: Professional Tax (PT) & TDS Returns (Form 138 / 24Q / TRACES)
 * 
 * Verifies:
 * 1. Professional Tax state slabs (Maharashtra, Karnataka, Telangana, Gujarat, Non-PT states)
 * 2. Maharashtra February adjustment (₹300 vs ₹200) and female exemption (≤ ₹25,000)
 * 3. Karnataka ₹25,000 threshold (Act 14 of 2023)
 * 4. PT Report generation (CSV summary and detail)
 * 5. TDS transition: FY 2025-26 uses Form 24Q / s.192; FY 2026-27 uses Form 138 / s.392
 * 6. Standard deduction: ₹75,000 (New Regime) vs ₹50,000 (Old Regime)
 * 7. Section 87A rebate (₹25,000 new regime / ₹12,500 old regime)
 * 8. Q4 Annexure II (S24) vs Non-Q4 return structure
 * 9. Employee Tax Computation Statement non-certificate legal disclaimer
 * 10. TRACES Certificate model validation
 */

import { calculateStatePt, generatePtReport, PtEmployeeRecord } from '../services/statutory/ptExportService';
import { 
  getTdsFormMetadata, 
  calculateAnnualIncomeTax, 
  computeEmployeeTax, 
  generateQuarterlyTdsReturn, 
  generateEmployeeComputationStatement,
  LEGAL_DISCLAIMER_TEXT,
  TdsEmployeeQuarterlyInput
} from '../services/statutory/tdsExportService';
import TdsCertificate from '../models/TdsCertificate';
import mongoose from 'mongoose';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error('    Details:', details);
  }
}

async function runPhase6Tests() {
  console.log('\n=== Running Phase 6 Tests: Professional Tax & TDS (Form 138/24Q/TRACES) ===\n');

  // -------------------------------------------------------------------------
  // 1. Professional Tax State Slabs
  // -------------------------------------------------------------------------
  console.log('--- Test Group 1: Professional Tax State Slabs & Adjustments ---');

  // Maharashtra tests
  // Male earning 8,000 -> 175
  const mhMale8k = calculateStatePt(8000, 'Maharashtra', 0, 'male');
  assert(mhMale8k.ptDeducted === 175, 'Maharashtra: Male gross ₹8,000 pays ₹175 PT');

  // Male earning 15,000 in January (month index 0) -> 200
  const mhMale15kJan = calculateStatePt(15000, 'Maharashtra', 0, 'male');
  assert(mhMale15kJan.ptDeducted === 200 && !mhMale15kJan.isFebruaryAdjustment, 'Maharashtra: Male gross ₹15,000 in Jan pays ₹200');

  // Male earning 15,000 in February (month index 1) -> 300 (February Adjustment)
  const mhMale15kFeb = calculateStatePt(15000, 'Maharashtra', 1, 'male');
  assert(mhMale15kFeb.ptDeducted === 300 && mhMale15kFeb.isFebruaryAdjustment, 'Maharashtra: Male gross ₹15,000 in Feb pays ₹300 (Feb adjustment)');

  // Female earning 24,000 in January -> 0 (Exempt under Mah. Act VIII of 2023)
  const mhFem24k = calculateStatePt(24000, 'Maharashtra', 0, 'female');
  assert(mhFem24k.ptDeducted === 0, 'Maharashtra: Female gross ₹24,000 is Exempt (≤ ₹25,000)');

  // Female earning 28,000 in January -> 200
  const mhFem28kJan = calculateStatePt(28000, 'Maharashtra', 0, 'female');
  assert(mhFem28kJan.ptDeducted === 200, 'Maharashtra: Female gross ₹28,000 pays ₹200 in Jan');

  // Female earning 28,000 in February -> 300
  const mhFem28kFeb = calculateStatePt(28000, 'Maharashtra', 1, 'female');
  assert(mhFem28kFeb.ptDeducted === 300 && mhFem28kFeb.isFebruaryAdjustment, 'Maharashtra: Female gross ₹28,000 pays ₹300 in Feb');

  // Karnataka tests (Act 14 of 2023: < 25,000 = 0, >= 25,000 = 200)
  const kaBelow = calculateStatePt(24999, 'Karnataka', 0);
  assert(kaBelow.ptDeducted === 0, 'Karnataka: Gross ₹24,999 pays ₹0 (below ₹25,000 threshold)');

  const kaAtThreshold = calculateStatePt(25000, 'Karnataka', 0);
  assert(kaAtThreshold.ptDeducted === 200, 'Karnataka: Gross ₹25,000 pays ₹200');

  const kaHigh = calculateStatePt(100000, 'Karnataka', 1);
  assert(kaHigh.ptDeducted === 200 && !kaHigh.isFebruaryAdjustment, 'Karnataka: High earner pays ₹200 flat across all months');

  // Telangana tests
  const tsLow = calculateStatePt(14000, 'Telangana', 0);
  assert(tsLow.ptDeducted === 0, 'Telangana: Gross ₹14,000 pays ₹0 (≤ ₹15k)');

  const tsMid = calculateStatePt(18000, 'Telangana', 0);
  assert(tsMid.ptDeducted === 150, 'Telangana: Gross ₹18,000 pays ₹150 (₹15k-₹20k)');

  const tsHigh = calculateStatePt(30000, 'Telangana', 0);
  assert(tsHigh.ptDeducted === 200, 'Telangana: Gross ₹30,000 pays ₹200 (> ₹20k)');

  // Gujarat tests
  const gjLow = calculateStatePt(11000, 'Gujarat', 0);
  assert(gjLow.ptDeducted === 0, 'Gujarat: Gross ₹11,000 pays ₹0 (≤ ₹12k)');

  const gjHigh = calculateStatePt(25000, 'Gujarat', 0);
  assert(gjHigh.ptDeducted === 200, 'Gujarat: Gross ₹25,000 pays ₹200 (> ₹12k)');

  // Non-PT states
  const delhi = calculateStatePt(80000, 'Delhi', 0);
  assert(delhi.ptDeducted === 0, 'Delhi: Zero PT (Non-PT state)');

  const haryana = calculateStatePt(75000, 'Haryana', 0);
  assert(haryana.ptDeducted === 0, 'Haryana: Zero PT (Non-PT state)');

  // PT Report Generation (multi-state roll-up)
  const testEmployees: PtEmployeeRecord[] = [
    { employeeId: '1', employeeName: 'Ramesh', employeeCode: 'E01', workState: 'Maharashtra', grossSalary: 30000, gender: 'male' },
    { employeeId: '2', employeeName: 'Priya', employeeCode: 'E02', workState: 'Maharashtra', grossSalary: 22000, gender: 'female' },
    { employeeId: '3', employeeName: 'Suresh', employeeCode: 'E03', workState: 'Karnataka', grossSalary: 45000, gender: 'male' },
    { employeeId: '4', employeeName: 'Anita', employeeCode: 'E04', workState: 'Delhi', grossSalary: 60000, gender: 'female' },
  ];

  const mockRules: any = {
    pt: {
      applicable: true,
      stateRegistrations: [
        { state: 'Maharashtra', registrationNumber: 'PT-MH-999', ptoCircle: 'Circle 1' },
        { state: 'Karnataka', registrationNumber: 'PT-KA-888', ptoCircle: 'Circle 2' },
      ],
    },
  };

  const febReport = generatePtReport(testEmployees, mockRules, 2027, 1); // February 2027
  // Ramesh: 300 (Feb), Priya: 0 (female <= 25k), Suresh: 200, Anita: 0
  assert(febReport.totalPtCollected === 500, 'PT Report: Feb total is ₹500 (Ramesh ₹300 + Suresh ₹200)');
  assert(febReport.stateSummaries.length === 3, 'PT Report: Generates summaries for 3 states (MH, KA, DL)');
  assert(febReport.csvSummary.includes('Maharashtra') && febReport.csvSummary.includes('PT-MH-999'), 'PT Report: CSV summary includes state registration');
  assert(febReport.csvDetail.includes('Ramesh') && febReport.csvDetail.includes('300'), 'PT Report: Detail CSV includes Feb adjustment');

  // -------------------------------------------------------------------------
  // 2. TDS Transition & Statutory Forms (Rule 6)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 2: TDS Law Transition (Form 24Q vs Form 138) ---');

  const metaOld = getTdsFormMetadata('2025-26');
  assert(metaOld.formType === 'FORM_24Q', 'FY 2025-26 uses Form 24Q');
  assert(metaOld.sectionCode === '192', 'FY 2025-26 section code is 192 (Income-tax Act, 1961)');

  const metaNew = getTdsFormMetadata('2026-27');
  assert(metaNew.formType === 'FORM_138', 'FY 2026-27 uses Form 138');
  assert(metaNew.sectionCode === '392', 'FY 2026-27 section code is 392 (Income-tax Act, 2025)');

  // -------------------------------------------------------------------------
  // 3. Tax Slabs, Standard Deduction & Section 87A Rebate
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Tax Computation, Standard Deduction & 87A Rebate ---');

  // Taxable income 7,00,000 under New Regime -> Tax 20,000 - Rebate 87A (20,000) = 0
  const tax700kNew = calculateAnnualIncomeTax(700000, 'NEW');
  assert(tax700kNew.tax === 20000, 'New Regime: Tax on ₹7,00,000 is ₹20,000 before rebate');
  assert(tax700kNew.rebate87A === 20000, 'New Regime: 87A rebate covers full ₹20,000 (income ≤ ₹7L)');
  assert(tax700kNew.totalTax === 0, 'New Regime: Net tax is ₹0 for ₹7,00,000 taxable income');

  // Taxable income 10,00,000 under New Regime
  // 0-3L: 0, 3-7L: 20k, 7-10L: 30k => 50k tax + 4% cess (2,000) = 52,000
  const tax1000kNew = calculateAnnualIncomeTax(1000000, 'NEW');
  assert(tax1000kNew.tax === 50000, 'New Regime: Tax on ₹10,00,000 is ₹50,000');
  assert(tax1000kNew.rebate87A === 0, 'New Regime: No 87A rebate for income > ₹7,00,000');
  assert(tax1000kNew.cess === 2000, 'New Regime: 4% cess on ₹50,000 is ₹2,000');
  assert(tax1000kNew.totalTax === 52000, 'New Regime: Total tax payable is ₹52,000');

  // Employee computation with standard deduction
  // Gross ₹7,75,000 in New Regime -> Less Std Ded ₹75,000 = Taxable ₹7,00,000 -> Net tax ₹0
  const mockEmpNew: TdsEmployeeQuarterlyInput = {
    employeeId: 'emp-101',
    employeeName: 'Amit Verma',
    employeeCode: 'NX101',
    pan: 'ABCDE1234F',
    taxRegime: 'NEW',
    monthlyRecords: Array(12).fill(null).map((_, i) => ({
      month: i,
      year: 2026,
      grossSalary: 64583.33,
      taxableEarnings: 64583.33,
      exemptAllowances: 0,
      tdsDeducted: 0,
    })),
  };

  const compNew = computeEmployeeTax(mockEmpNew, [3, 4, 5]);
  assert(compNew.standardDeduction === 75000, 'New Regime gets ₹75,000 Standard Deduction');
  assert(compNew.netTaxableIncome === 700000, 'Gross ₹7.75L - ₹75k std ded = ₹7,00,000 net taxable');
  assert(compNew.totalTaxPayable === 0, 'Gross ₹7.75L under New Regime has ₹0 final tax liability');

  // Gross ₹5,50,000 in Old Regime -> Less Std Ded ₹50,000 = Taxable ₹5,00,000 -> Net tax ₹0
  const mockEmpOld: TdsEmployeeQuarterlyInput = {
    employeeId: 'emp-102',
    employeeName: 'Vikas Sharma',
    employeeCode: 'NX102',
    pan: 'BCDEF2345G',
    taxRegime: 'OLD',
    monthlyRecords: Array(12).fill(null).map((_, i) => ({
      month: i,
      year: 2026,
      grossSalary: 45833.33,
      taxableEarnings: 45833.33,
      exemptAllowances: 0,
      tdsDeducted: 0,
    })),
  };

  const compOld = computeEmployeeTax(mockEmpOld, [3, 4, 5]);
  assert(compOld.standardDeduction === 50000, 'Old Regime gets ₹50,000 Standard Deduction');
  assert(compOld.netTaxableIncome === 500000, 'Gross ₹5.5L - ₹50k std ded = ₹5,00,000 net taxable');
  assert(compOld.totalTaxPayable === 0, 'Gross ₹5.5L under Old Regime has ₹0 final tax liability (87A rebate)');

  // -------------------------------------------------------------------------
  // 4. RPU Quarterly Return File Generation (Q1 vs Q4 Annexure II)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 4: RPU Quarterly Return Generation & Q4 Annexure II ---');

  const companyInfo = {
    companyName: 'Nexus Tech India Pvt Ltd',
    tan: 'MUMB99999A',
    pan: 'AAACN9999B',
    address: 'BKC Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
    responsiblePersonName: 'A. Sharma',
    responsiblePersonDesignation: 'Director',
  };

  // Generate Q1 return for FY 2026-27 (Form 138)
  const q1Return = generateQuarterlyTdsReturn('2026-27', 'Q1', companyInfo, [mockEmpNew, mockEmpOld]);
  assert(q1Return.formType === 'FORM_138', 'Q1 return generates Form 138 for 2026-27');
  assert(q1Return.sectionCode === '392', 'Q1 return uses Section 392');
  assert(q1Return.rpuFileContent.startsWith('FH^SL^1^eTDS^FORM_138^2026-27^2027-28^1'), 'RPU file header contains Form 138');
  assert(!q1Return.rpuFileContent.includes('S24^'), 'Q1 return does NOT contain S24 Annexure II');

  // Generate Q4 return for FY 2026-27 (Must include Annexure II)
  const q4Return = generateQuarterlyTdsReturn('2026-27', 'Q4', companyInfo, [mockEmpNew, mockEmpOld]);
  assert(q4Return.isQ4, 'Q4 flag is true');
  assert(q4Return.rpuFileContent.includes('S24^1^ABCDE1234F^Amit Verma'), 'Q4 return contains S24 Annexure II record for employee 1');
  assert(q4Return.rpuFileContent.includes('S24^2^BCDEF2345G^Vikas Sharma'), 'Q4 return contains S24 Annexure II record for employee 2');

  // Generate Q1 return for FY 2025-26 (Form 24Q)
  const q1ReturnOld = generateQuarterlyTdsReturn('2025-26', 'Q1', companyInfo, [mockEmpNew]);
  assert(q1ReturnOld.formType === 'FORM_24Q', 'Q1 return generates Form 24Q for 2025-26');
  assert(q1ReturnOld.sectionCode === '192', 'Q1 return uses Section 192 for 2025-26');

  // -------------------------------------------------------------------------
  // 5. Legal Disclaimer & Computation Statement (Rule 7)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Rule 7 Non-Certificate Legal Disclaimer ---');

  const statement = generateEmployeeComputationStatement(
    compNew,
    '2026-27',
    '2027-28',
    companyInfo.companyName,
    companyInfo.tan
  );

  assert(statement.includes('INTERNAL TAX COMPUTATION STATEMENT ONLY'), 'Computation statement contains internal title');
  assert(statement.includes('NOT a valid Tax Deduction Certificate') && statement.includes('Section 395'), 'Statement contains mandatory Section 395 disclaimer');
  assert(statement.includes('TRACES portal (https://contents.tdscpc.gov.in)'), 'Statement directs user to official TRACES portal');
  assert(!statement.includes('Certificate No:') || statement.includes('Official TDS Certificates'), 'nexusHR does not issue mock certificates');

  // -------------------------------------------------------------------------
  // 6. TRACES Certificate Model Validation
  // -------------------------------------------------------------------------
  console.log('\n--- Test Group 6: TRACES Certificate Schema Validation ---');

  const testCert = new TdsCertificate({
    employeeId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    financialYear: '2026-27',
    assessmentYear: '2027-28',
    certificateType: 'FORM_130',
    quarter: 'ANNUAL',
    part: 'COMBINED',
    fileName: 'TRACES_FORM130_2026-27.pdf',
    fileUrl: 'https://storage.nexushr.internal/tds/TRACES_FORM130_2026-27.pdf',
    fileSize: 204850,
    mimeType: 'application/pdf',
    tracesCertificateNumber: 'TRACES-130-99887766',
    uploadedBy: new mongoose.Types.ObjectId(),
    disclaimerAcknowledged: true,
  });

  const validationError = testCert.validateSync();
  assert(!validationError, 'TdsCertificate model validates successfully for FORM_130');
  assert(testCert.certificateType === 'FORM_130', 'Certificate type is FORM_130');

  // Summary
  console.log('\n=======================================================');
  console.log(`Phase 6 Test Results: ${passed} passed, ${failed} failed`);
  console.log('=======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
