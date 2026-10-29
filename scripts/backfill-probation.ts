/**
 * Backfill probation windows for existing employees.
 *
 * New hires get a probation window at creation time. Workspaces created before
 * probation tracking existed have none, so this script stamps a window on every
 * employee who joined within the last N months.
 *
 * Usage:
 *   npx tsx scripts/backfill-probation.ts           # dry run (prints candidates)
 *   npx tsx scripts/backfill-probation.ts --apply   # write the windows
 *   npx tsx scripts/backfill-probation.ts --apply --months=6 --within=12
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  });
}

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const monthsArg = args.find((arg) => arg.startsWith('--months='));
  const withinArg = args.find((arg) => arg.startsWith('--within='));
  const probationMonths = monthsArg ? Number(monthsArg.split('=')[1]) : 3;
  const withinMonths = withinArg ? Number(withinArg.split('=')[1]) : 12;

  if (!Number.isFinite(probationMonths) || probationMonths <= 0) {
    console.error('--months must be a positive number');
    process.exit(1);
  }

  const { buildProbationWindow } = await import('../lib/probation');
  const User = (await import('../models/User')).default;

  await mongoose.connect(MONGODB_URI);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - withinMonths);

  const employees = await User.find({
    isCandidate: { $ne: true },
    probationStatus: null,
    joiningDate: { $gte: cutoff, $lte: new Date() },
  })
    .select('name email employeeId department joiningDate')
    .sort({ joiningDate: -1 })
    .lean();

  console.log(
    `${employees.length} employee(s) joined in the last ${withinMonths} month(s) without a probation window.`
  );

  let updated = 0;
  for (const employee of employees) {
    const window = buildProbationWindow(employee.joiningDate, probationMonths);
    if (!window) continue;

    console.log(
      `${apply ? 'set' : 'would set'}  ${employee.name} (${employee.employeeId || 'no id'})  ` +
        `${window.startDate.toISOString().slice(0, 10)} → ${window.endDate.toISOString().slice(0, 10)}`
    );

    if (apply) {
      await User.updateOne(
        { _id: employee._id, probationStatus: null },
        {
          $set: {
            probationStatus: 'on_probation',
            probationMonths: window.months,
            probationStartDate: window.startDate,
            probationEndDate: window.endDate,
          },
        }
      );
      updated += 1;
    }
  }

  console.log(apply ? `Updated ${updated} employee(s).` : 'Dry run — re-run with --apply to write.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
