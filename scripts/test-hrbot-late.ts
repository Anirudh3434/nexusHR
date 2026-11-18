import './_load-env';

import connectDB from '../lib/mongodb';
import User from '../models/User';
import { createHrBotToolkit } from '../lib/mcp-hrbot';
import type { UserContext } from '../mcp-server/auth';

async function main() {
  await connectDB();

  const dbUser = (await User.findOne({ isActive: true, role: 'admin' }).lean()) as any;
  const ctx: UserContext = {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: 'admin',
    // Demo tenant that actually has late records in this database.
    companyId: '6ae09796a83eeca0f1a2e7ac',
    tokenPermissions: [],
    allowedModules: [],
  };

  const toolkit = await createHrBotToolkit(ctx);
  for (const day of ['2026-10-28', '2026-11-05']) {
    const res = await toolkit.call('get_late_arrivals', { date: day });
    const parsed = JSON.parse(res.text);
    console.log(
      `${parsed.date}: lateCount=${parsed.lateCount} scope=${parsed.scope}`,
      parsed.employees.slice(0, 3).map((e: any) => `${e.employee}(${e.lateMinutes}m @${e.checkIn})`).join(', ')
    );
  }

  // Employee scoping: same company, employee role -> self only.
  const emp: UserContext = { ...ctx, role: 'employee', id: '6ae1eedd0b655e7a235c4262' };
  const empToolkit = await createHrBotToolkit(emp);
  const own = JSON.parse((await empToolkit.call('get_late_arrivals', { date: '2026-10-28' })).text);
  console.log(`employee scope=${own.scope} lateCount=${own.lateCount}`);
  await empToolkit.close?.();
  await toolkit.close?.();

  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
