/**
 * Phase 3 Test Suite: Layered Statutory Configuration
 * 
 * Verifies:
 * 1. Layer 1: Global versioned statutory defaults
 * 2. Layer 2: Company settings and validation (rejection of illegal values)
 * 3. Layer 3: Employee overrides (VPF, PF opt-out, work state)
 * 4. Precedence: Layer 1 -> Layer 2 -> Layer 3
 * 5. Immutable StatutoryRuleSnapshot creation and SHA-256 checksum
 * 6. Regression on existing companies without explicit statutoryConfig
 * 7. Preview Impact Simulation engine
 */

import connectDB from '../lib/mongodb';
import Company from '../models/Company';
import Employee from '../models/Employee';
import User from '../models/User';
import StatutoryRuleSnapshot from '../models/StatutoryRuleSnapshot';
import {
  resolveCompanyRules,
  resolveEmployeeRules,
  validateCompanyStatutorySettings,
  createOrGetSnapshot,
  simulateStatutoryImpact,
} from '../services/statutory/ruleResolverService';

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
  console.log('RUNNING PHASE 3 LAYERED STATUTORY CONFIG TEST SUITE');
  console.log('=====================================================\n');

  await connectDB();

  // Test Group 1: Company Settings Validation (Reject illegal values)
  console.log('--- 1. Company Statutory Settings Validation ---');
  const invalidEsi = validateCompanyStatutorySettings({
    esi: { enabled: true, threshold: 18000 }, // illegal: below statutory 21,000
  });
  assertEqual('Validation rejects ESI threshold < 21,000', invalidEsi.valid, false);
  assertEqual('Validation error message is clear', invalidEsi.errors[0].includes('21,000'), true);

  const invalidWageCeiling = validateCompanyStatutorySettings({
    pf: { enabled: true, wageCeilingMode: 'invalid_mode' },
  });
  assertEqual('Validation rejects invalid PF wage ceiling mode', invalidWageCeiling.valid, false);

  const validSettings = validateCompanyStatutorySettings({
    pf: { enabled: true, establishmentCode: 'MH/BAN/0012345/000', wageCeilingMode: 'actual_wages' },
    esi: { enabled: true, establishmentCode: '11000123450000101', threshold: 25000 },
    tax: { tanNumber: 'MUMB12345A', defaultRegime: 'new' },
    general: { roundingMode: 'round' },
  });
  assertEqual('Validation accepts valid statutory configuration', validSettings.valid, true);

  // Setup mock company for tests
  const testCompanyCode = `TEST_STAT_${Date.now()}`;
  const testCompany = await Company.create({
    name: 'Statutory Test Corp',
    code: testCompanyCode,
    email: `${testCompanyCode}@test.com`,
    officeLocation: { latitude: 19.076, longitude: 72.877, address: 'Mumbai, Maharashtra' },
    statutoryConfig: {
      pf: {
        enabled: true,
        establishmentCode: 'MH/BAN/0099999/000',
        wageCeilingMode: 'statutory_ceiling',
        employerShareInCtc: true,
      },
      esi: {
        enabled: true,
        establishmentCode: '11000999990000101',
        threshold: 21000,
        enforceContributionPeriod: true,
      },
      pt: {
        enabled: true,
        stateRegistrations: [
          { state: 'Maharashtra', registrationNumber: 'MH-PT-12345' },
          { state: 'Karnataka', registrationNumber: 'KA-PT-67890' },
        ],
      },
      tax: {
        tanNumber: 'MUMB99999A',
        defaultRegime: 'new',
      },
      general: {
        roundingMode: 'round',
      },
    },
  });

  // Setup mock user & employee
  const testUser = await User.create({
    name: 'Rahul Sharma',
    email: `rahul_${Date.now()}@test.com`,
    password: 'Password123!',
    companyId: testCompany._id,
    salary: 60000,
    address: { state: 'Maharashtra', country: 'India' },
  });

  const testEmployee = await Employee.create({
    userId: testUser._id,
    companyId: testCompany._id,
    employeeId: `EMP_${Date.now()}`,
    firstName: 'Rahul',
    lastName: 'Sharma',
    joiningDate: new Date('2026-04-01'),
    workState: 'Karnataka', // Overrides residential address state
    uan: '100999888777',
    esicIpNumber: '1199887766',
    taxRegime: 'old', // Employee override from default 'new'
    pfOverride: {
      optOut: false,
      vpfAmount: 5000, // VPF override
      vpfPercentage: 0,
    },
  });

  // Test Group 2: Layer 1 + Layer 2 Company-Level Rule Resolution
  console.log('\n--- 2. Layer 1 + Layer 2 Company Rule Resolution ---');
  // For October 2026 (month 9)
  const resolvedCompanyOct = await resolveCompanyRules(testCompany._id.toString(), 2026, 9);
  assertEqual('Company PF ceiling is ₹25,000 (Notification S.O. 5109(E))', resolvedCompanyOct.pf.ceiling, 25000);
  assertEqual('Company PF max employee share is ₹3,000', resolvedCompanyOct.pf.maxEmployeePf, 3000);
  assertEqual('Company PF establishment code matches Layer 2', resolvedCompanyOct.pf.establishmentCode, 'MH/BAN/0099999/000');
  assertEqual('Company ESI threshold matches Layer 2', resolvedCompanyOct.esi.threshold, 21000);
  assertEqual('Income-tax Act resolved to 2025 for FY 2026-27', resolvedCompanyOct.tax.act, '2025');

  // For August 2026 (month 7, pre-revision)
  const resolvedCompanyAug = await resolveCompanyRules(testCompany._id.toString(), 2026, 7);
  assertEqual('Pre-revision PF ceiling is ₹15,000', resolvedCompanyAug.pf.ceiling, 15000);
  assertEqual('Pre-revision PF max employee share is ₹1,800', resolvedCompanyAug.pf.maxEmployeePf, 1800);

  // Test Group 3: Layer 3 Employee Override Resolution
  console.log('\n--- 3. Layer 3 Employee Override Resolution ---');
  const resolvedEmp = await resolveEmployeeRules(testUser._id.toString(), testCompany._id.toString(), 2026, 9);
  assertEqual('Employee workState overridden to Karnataka', resolvedEmp.pt.workState, 'Karnataka');
  assertEqual('Employee PT registration matched for Karnataka', resolvedEmp.pt.registrationNumber, 'KA-PT-67890');
  assertEqual('Employee VPF amount is ₹5,000', resolvedEmp.pf.vpfAmount, 5000);
  assertEqual('Employee tax regime overridden to "old"', resolvedEmp.tax.regime, 'old');
  assertEqual('Employee UAN preserved', resolvedEmp.identifiers.uan, '100999888777');
  assertEqual('Employee ESIC IP number preserved', resolvedEmp.identifiers.esicIpNumber, '1199887766');

  // Test Group 4: Snapshot Creation & Immutability
  console.log('\n--- 4. Statutory Rule Snapshot & Immutability ---');
  const snapshot1 = await createOrGetSnapshot(testCompany._id.toString(), 2026, 9);
  assertEqual('Snapshot created with isLocked: true', snapshot1.isLocked, true);
  assertEqual('Snapshot contains SHA-256 checksum', typeof snapshot1.checksum === 'string' && snapshot1.checksum.length === 64, true);

  const snapshot2 = await createOrGetSnapshot(testCompany._id.toString(), 2026, 9);
  assertEqual('Subsequent snapshot fetch returns exact same snapshot ID', snapshot1._id.toString(), snapshot2._id.toString());
  assertEqual('Checksums are identical', snapshot1.checksum, snapshot2.checksum);

  // Test Group 5: Regression Test for Existing Companies without explicit statutoryConfig
  console.log('\n--- 5. Regression Test for Companies with Empty statutoryConfig ---');
  const legacyCompany = await Company.create({
    name: 'Legacy Tech LLP',
    code: `LEGACY_${Date.now()}`,
    email: `legacy_${Date.now()}@test.com`,
    officeLocation: { latitude: 12.971, longitude: 77.594, address: 'Bengaluru, Karnataka' },
    // no statutoryConfig provided
  });

  const legacyResolved = await resolveCompanyRules(legacyCompany._id.toString(), 2026, 9);
  assertEqual('Legacy company default PF is enabled', legacyResolved.pf.enabled, true);
  assertEqual('Legacy company default PF ceiling mode is statutory_ceiling', legacyResolved.pf.wageCeilingMode, 'statutory_ceiling');
  assertEqual('Legacy company default ESI threshold is 21,000', legacyResolved.esi.threshold, 21000);
  assertEqual('Legacy company default rounding is round', legacyResolved.general.roundingMode, 'round');

  // Test Group 6: Preview Impact Simulation
  console.log('\n--- 6. Preview Impact Simulation Engine ---');
  const simulation = await simulateStatutoryImpact(testCompany._id.toString(), {
    pf: { wageCeilingMode: 'actual_wages' }, // change to actual wages
  }, 2026, 9);

  assertEqual('Simulation evaluated active employees count', simulation.employeeCount >= 1, true);
  assertEqual('Simulation contains net pay difference metric', typeof simulation.netPayDifference === 'number', true);
  assertEqual('Simulation contains employer liability difference metric', typeof simulation.employerLiabilityDifference === 'number', true);

  // Clean up mock test records
  await Company.deleteMany({ _id: { $in: [testCompany._id, legacyCompany._id] } });
  await User.deleteOne({ _id: testUser._id });
  await Employee.deleteOne({ _id: testEmployee._id });
  await StatutoryRuleSnapshot.deleteMany({ companyId: { $in: [testCompany._id, legacyCompany._id] } });

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
  console.error('Fatal test error in Phase 3:', e);
  process.exit(1);
});
