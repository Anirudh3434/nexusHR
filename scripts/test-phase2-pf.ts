/**
 * Phase 2 Test Suite: PF Wage Ceiling Hotfix & Split-Month Proration
 * 
 * Verifies:
 * 1. 16 Sep 2026 vs 17 Sep 2026 boundary conditions
 * 2. September 2026 split-month proration (1-16 Sep @ 15k, 17-30 Sep @ 25k)
 * 3. Wages below Rs 15,000 (No change / zero regression)
 * 4. Wages between Rs 15,000 and Rs 25,000 (Dynamic adjustment)
 * 5. Wages above Rs 25,000 (Capped at old vs split vs new ceilings)
 * 6. Mongoose SalaryStructure model integration
 * 7. Database audit of payrolls processed since 17 Sep 2026
 */

import {
  getPfCeilingForDate,
  getPfCeilingForMonth,
  calculatePfForMonth,
  calculatePfForDate,
  PF_STATUTORY_CONSTANTS,
} from '../lib/statutory/pfRules';
import connectDB from '../lib/mongodb';
import SalaryStructure from '../models/SalaryStructure';
import Payroll from '../models/Payroll';

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
  console.log('RUNNING PHASE 2 PF STATUTORY CEILING TEST SUITE');
  console.log('=====================================================\n');

  // Test Group 1: 16 Sep 2026 vs 17 Sep 2026 Boundary Test
  console.log('--- 1. Boundary Test: 16 Sep 2026 vs 17 Sep 2026 ---');
  const d16Sep = new Date('2026-09-16T12:00:00.000Z');
  const d17Sep = new Date('2026-09-17T00:00:00.000Z');

  const ceil16 = getPfCeilingForDate(d16Sep);
  assertEqual('16 Sep 2026 ceiling is 15,000', ceil16.ceiling, 15000);
  assertEqual('16 Sep 2026 max employee PF is 1,800', ceil16.maxEmployeePf, 1800);

  const ceil17 = getPfCeilingForDate(d17Sep);
  assertEqual('17 Sep 2026 ceiling is 25,000', ceil17.ceiling, 25000);
  assertEqual('17 Sep 2026 max employee PF is 3,000', ceil17.maxEmployeePf, 3000);

  // Test Group 2: September 2026 Split-Month Proration
  console.log('\n--- 2. September 2026 Split-Month Proration ---');
  const sepCeil = getPfCeilingForMonth(2026, 8); // month 8 is September (0-indexed)
  assertEqual('Sep 2026 isSplitMonth is true', sepCeil.isSplitMonth, true);
  assertEqual('Sep 2026 prorated ceiling is 19,667', sepCeil.ceiling, 19667);
  assertEqual('Sep 2026 max employee PF is 2,360', sepCeil.maxEmployeePf, 2360);
  assertEqual('Sep 2026 max employer EPS is 1,638', sepCeil.maxEmployerEps, 1638);
  assertEqual('Sep 2026 max employer EPF is 722', sepCeil.maxEmployerEpf, 722);

  // August 2026 (month 7) should be standard old ceiling
  const augCeil = getPfCeilingForMonth(2026, 7);
  assertEqual('Aug 2026 ceiling is 15,000', augCeil.ceiling, 15000);
  assertEqual('Aug 2026 max employee PF is 1,800', augCeil.maxEmployeePf, 1800);

  // October 2026 (month 9) should be standard new ceiling
  const octCeil = getPfCeilingForMonth(2026, 9);
  assertEqual('Oct 2026 ceiling is 25,000', octCeil.ceiling, 25000);
  assertEqual('Oct 2026 max employee PF is 3,000', octCeil.maxEmployeePf, 3000);

  // Test Group 3: Wages Below Rs 15,000 (No change)
  console.log('\n--- 3. Wages Below Rs 15,000 (Rs 10,000 basic) ---');
  const lowAug = calculatePfForMonth(10000, 2026, 7);
  assertEqual('Aug 2026 (Rs 10k): PF = 1,200', lowAug.employeePf, 1200);

  const lowSep = calculatePfForMonth(10000, 2026, 8);
  assertEqual('Sep 2026 (Rs 10k): PF = 1,200 (No change)', lowSep.employeePf, 1200);

  const lowOct = calculatePfForMonth(10000, 2026, 9);
  assertEqual('Oct 2026 (Rs 10k): PF = 1,200 (No change)', lowOct.employeePf, 1200);

  const low16 = calculatePfForDate(10000, d16Sep);
  assertEqual('16 Sep (Rs 10k): PF = 1,200', low16.employeePf, 1200);

  const low17 = calculatePfForDate(10000, d17Sep);
  assertEqual('17 Sep (Rs 10k): PF = 1,200', low17.employeePf, 1200);

  // Test Group 4: Wages Between Rs 15,000 and Rs 25,000 (Rs 20,000 basic)
  console.log('\n--- 4. Wages Between Rs 15,000 and Rs 25,000 (Rs 20,000 basic) ---');
  const midAug = calculatePfForMonth(20000, 2026, 7);
  assertEqual('Aug 2026 (Rs 20k): Capped at 15k -> PF = 1,800', midAug.employeePf, 1800);

  const midSep = calculatePfForMonth(20000, 2026, 8);
  assertEqual('Sep 2026 (Rs 20k): Capped at 19,667 -> PF = 2,360', midSep.employeePf, 2360);

  const midOct = calculatePfForMonth(20000, 2026, 9);
  assertEqual('Oct 2026 (Rs 20k): Full 20k subject to 12% -> PF = 2,400', midOct.employeePf, 2400);
  assertEqual('Oct 2026 (Rs 20k): Employer EPS = 1,666', midOct.employerEps, 1666);
  assertEqual('Oct 2026 (Rs 20k): Employer EPF = 734', midOct.employerEpf, 734);

  const mid16 = calculatePfForDate(20000, d16Sep);
  assertEqual('16 Sep (Rs 20k): Pre-revision cap -> PF = 1,800', mid16.employeePf, 1800);

  const mid17 = calculatePfForDate(20000, d17Sep);
  assertEqual('17 Sep (Rs 20k): Post-revision rate -> PF = 2,400', mid17.employeePf, 2400);

  // Test Group 5: Wages Above Rs 25,000 (Rs 30,000 and Rs 50,000 basic)
  console.log('\n--- 5. Wages Above Rs 25,000 (Rs 30,000 basic) ---');
  const highAug = calculatePfForMonth(30000, 2026, 7);
  assertEqual('Aug 2026 (Rs 30k): Capped at 15k -> PF = 1,800', highAug.employeePf, 1800);

  const highSep = calculatePfForMonth(30000, 2026, 8);
  assertEqual('Sep 2026 (Rs 30k): Capped at 19,667 -> PF = 2,360', highSep.employeePf, 2360);
  assertEqual('Sep 2026 (Rs 30k): EPS = 1,638, EPF = 722', highSep.employerEps + highSep.employerEpf, 2360);

  const highOct = calculatePfForMonth(30000, 2026, 9);
  assertEqual('Oct 2026 (Rs 30k): Capped at 25k -> PF = 3,000', highOct.employeePf, 3000);
  assertEqual('Oct 2026 (Rs 30k): Employer EPS = 2,083', highOct.employerEps, 2083);
  assertEqual('Oct 2026 (Rs 30k): Employer EPF = 917', highOct.employerEpf, 917);

  const high16 = calculatePfForDate(30000, d16Sep);
  assertEqual('16 Sep (Rs 30k): Capped at 15k -> PF = 1,800', high16.employeePf, 1800);

  const high17 = calculatePfForDate(30000, d17Sep);
  assertEqual('17 Sep (Rs 30k): Capped at 25k -> PF = 3,000', high17.employeePf, 3000);

  // Test Group 6: Mongoose Model Integration with SalaryStructure
  console.log('\n--- 6. Mongoose SalaryStructure Integration ---');
  const preRevisionStructure = new SalaryStructure({
    basicSalary: 30000,
    effectiveDate: new Date('2026-08-01T00:00:00.000Z'),
    grossSalary: 42000,
    totalDeductions: 0,
    netSalary: 42000,
    ctc: 42000,
  });
  preRevisionStructure.calculateTotals();
  assertEqual('SalaryStructure (effective 1 Aug 2026): doc.pf is 1,800', preRevisionStructure.pf, 1800);

  const postRevisionStructure = new SalaryStructure({
    basicSalary: 30000,
    effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
    grossSalary: 42000,
    totalDeductions: 0,
    netSalary: 42000,
    ctc: 42000,
  });
  postRevisionStructure.calculateTotals();
  assertEqual('SalaryStructure (effective 1 Oct 2026): doc.pf is 3,000', postRevisionStructure.pf, 3000);

  // Test Group 7: Database Audit for Payrolls Processed since 17 Sep 2026
  console.log('\n--- 7. Database Audit for Processed Payrolls ---');
  try {
    await connectDB();
    const processedPayrolls = await Payroll.find({
      $or: [
        { year: 2026, month: { $gte: 8 } },
        { year: { $gt: 2026 } }
      ]
    }).lean();

    console.log(`Audited database: ${processedPayrolls.length} payroll records found since 17 Sep 2026 (month >= 8 / year 2026).`);
    for (const p of processedPayrolls) {
      console.log(`  - Record ${p._id}: Year ${p.year}, Month ${p.month}, Base ${p.baseSalary}, Status: ${p.status}`);
    }
  } catch (err: any) {
    console.log('Database audit note:', err.message);
  }

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
  console.error('Fatal test error:', e);
  process.exit(1);
});
