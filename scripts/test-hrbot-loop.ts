import './_load-env';

import connectDB from '../lib/mongodb';
import User from '../models/User';
import axios from 'axios';
import { createHrBotToolkit } from '../lib/mcp-hrbot';
import { queryHRKnowledge } from '../lib/nvidia-ai';
import type { UserContext } from '../mcp-server/auth';

/**
 * Offline test of the Nexi <-> MCP agent loop:
 * stubs the NVIDIA endpoint so we verify the tool round-trip without network.
 */
async function main() {
  process.env.NVIDIA_API_KEY = 'test-key';
  await connectDB();

  const dbUser = (await User.findOne({ isActive: true }).lean()) as any;
  const ctx: UserContext = {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role || 'employee',
    companyId: dbUser.companyId?.toString(),
    tokenPermissions: [],
    allowedModules: [],
  };

  const toolkit = await createHrBotToolkit(ctx);

  const seen: any[] = [];
  const originalPost = axios.post;
  (axios as any).post = async (_url: string, payload: any) => {
    seen.push(payload);
    if (seen.length === 1) {
      return {
        data: {
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'get_leaves', arguments: '{"status":"all","limit":2}' },
                  },
                ],
              },
            },
          ],
        },
      };
    }
    return {
      data: { choices: [{ message: { content: 'You have 2 leave requests on record.' } }] },
    };
  };

  try {
    const result = await queryHRKnowledge(
      {
        question: 'How many leave requests do I have?',
        companyId: ctx.companyId!,
        userId: ctx.id,
        userName: ctx.name,
        toolkit,
      },
      []
    );

    console.log('rounds:', seen.length);
    console.log('tools offered:', seen[0].tools?.length);
    console.log('tool_choice:', seen[0].tool_choice);
    const toolMsg = seen[1]?.messages?.find((m: any) => m.role === 'tool');
    console.log('tool reply fed back:', toolMsg ? toolMsg.content.slice(0, 120).replace(/\n/g, ' ') : 'MISSING');
    console.log('answer:', result.response);
    console.log(result.response.includes('2 leave requests') && toolMsg ? '\nLOOP OK' : '\nLOOP BROKEN');
  } finally {
    (axios as any).post = originalPost;
    await toolkit.close?.();
  }
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
