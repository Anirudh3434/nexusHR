import { NextResponse } from 'next/server';
import axios from 'axios';
import { getHrChatProvider, queryHRKnowledge } from '@/lib/nvidia-ai';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { createHrBotToolkit } from '@/lib/mcp-hrbot';
import type { UserContext } from '@/mcp-server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dev-only diagnostic for Nexi's chat provider. Never exposes key values.
 * GET /api/ai/hr/diag          -> env/provider visibility
 * GET /api/ai/hr/diag?ping=1   -> also performs a tiny completion
 * GET /api/ai/hr/diag?probe=1  -> full reproduction (MCP tools + agent loop)
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const provider = getHrChatProvider();
  const url = new URL(req.url);
  const body: Record<string, unknown> = {
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
    hasGroq: Boolean(process.env.GROQ_API_KEY),
    hasNvidia: Boolean(process.env.NVIDIA_API_KEY),
    groqKeyLength: process.env.GROQ_API_KEY?.length ?? 0,
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd(),
  };

  if (provider && url.searchParams.get('ping') === '1') {
    try {
      const res = await axios.post(
        provider.url,
        {
          model: provider.model,
          messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
          max_tokens: 20,
          temperature: 0,
        },
        {
          headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
          timeout: 20000,
        }
      );
      body.ping = { ok: true, reply: res.data?.choices?.[0]?.message?.content ?? null };
    } catch (err: any) {
      body.ping = {
        ok: false,
        status: err.response?.status ?? null,
        error: err.response?.data ?? err.message,
      };
    }
  }

  if (provider && url.searchParams.get('probe') === '1') {
    try {
      await connectDB();
      const dbUser = (await User.findOne({ isActive: true }).lean()) as any;
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

      const toolkit = await createHrBotToolkit(ctx);
      const tools = toolkit.definitions.map((t) => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));

      try {
        const res = await axios.post(
          provider.url,
          {
            model: provider.model,
            messages: [
              { role: 'system', content: 'You are Nexi, an HR assistant. Use tools when needed.' },
              { role: 'user', content: 'How many employees were late on 2026-10-28?' },
            ],
            tools,
            tool_choice: 'auto',
            temperature: 0.3,
            top_p: 0.7,
            max_tokens: 512,
          },
          {
            headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
            timeout: 30000,
          }
        );
        const message = res.data?.choices?.[0]?.message;
        body.toolsProbe = {
          ok: true,
          toolCalls: (message?.tool_calls || []).map((c: any) => c.function?.name),
          contentPreview: (message?.content || '').slice(0, 200),
        };
      } catch (err: any) {
        body.toolsProbe = {
          ok: false,
          status: err.response?.status ?? null,
          error: err.response?.data ?? err.message,
        };
      }

      const q = await queryHRKnowledge(
        {
          question: 'How many employees were late on 2026-10-28?',
          companyId: ctx.companyId!,
          userName: ctx.name,
          toolkit,
        },
        []
      );
      await toolkit.close?.();
      body.agent = { mode: q.mode, response: q.response.slice(0, 300) };
    } catch (err: any) {
      body.probeError = err?.message ?? String(err);
    }
  }

  return NextResponse.json(body);
}
