import './_load-env';

import connectDB from '../lib/mongodb';
import User from '../models/User';
import { createHrBotToolkit } from '../lib/mcp-hrbot';
import { queryHRKnowledge, getHrChatProvider } from '../lib/nvidia-ai';
import type { UserContext } from '../mcp-server/auth';

async function main() {
  await connectDB();

  const provider = getHrChatProvider();
  console.log('provider:', provider?.name, '| model:', provider?.model);
  if (!provider) throw new Error('No AI key configured');

  const admin = (await User.findOne({ email: 'anirudh@abacasys.com' }).lean()) as any;
  const ctx: UserContext = {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    companyId: admin.companyId?.toString(),
    tokenPermissions: [],
    allowedModules: [],
  };

  const toolkit = await createHrBotToolkit(ctx);
  const ask = async (question: string) => {
    const result = await queryHRKnowledge(
      { question, companyId: ctx.companyId!, userId: ctx.id, userName: ctx.name, toolkit },
      []
    );
    console.log(`\nQ: ${question}\nmode: ${result.mode}\n${result.response}`);
    return result;
  };

  try {
    await ask('how many employees are late today?');
    await ask('who was late on 2026-10-28?');
  } finally {
    await toolkit.close?.();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED:', err?.response?.data ?? err);
  process.exit(1);
});
