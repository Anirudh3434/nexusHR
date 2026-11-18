import './_load-env';

import connectDB from '../lib/mongodb';
import User from '../models/User';
import { createHrBotToolkit } from '../lib/mcp-hrbot';
import type { UserContext } from '../mcp-server/auth';

async function main() {
  await connectDB();

  const dbUser = await User.findOne({ isActive: true }).sort({ role: 1 }).lean() as any;
  if (!dbUser) throw new Error('No active user found');

  const ctx: UserContext = {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role || 'employee',
    companyId: dbUser.companyId?.toString(),
    department: dbUser.department,
    designation: dbUser.designation,
    tokenPermissions: [],
    allowedModules: [],
  };

  console.log(`\nUser: ${ctx.name} (${ctx.role})`);

  const toolkit = await createHrBotToolkit(ctx);
  console.log(`\nExposed tools (${toolkit.definitions.length}):`);
  for (const tool of toolkit.definitions) console.log(` - ${tool.name}`);

  console.log('\n--- get_current_user_profile ---');
  console.log((await toolkit.call('get_current_user_profile', {})).text.slice(0, 600));

  console.log('\n--- get_leaves ---');
  console.log((await toolkit.call('get_leaves', { status: 'all', limit: 3 })).text.slice(0, 600));

  console.log('\n--- get_attendance_records ---');
  console.log((await toolkit.call('get_attendance_records', {})).text.slice(0, 600));

  console.log('\n--- blocked write tool (should refuse) ---');
  console.log(await toolkit.call('clock_in', {}));

  await toolkit.close();
  console.log('\nclosed cleanly');
  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
