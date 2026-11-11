import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createNexusMcpServer } from '@/mcp-server/factory';
import { mcpContextStorage, type UserContext } from '@/mcp-server/auth';
import type { HrBotToolkit, HrBotToolDefinition } from './nvidia-ai';

/**
 * Tools Nexi (the HR chatbot) may call without side effects.
 * Everything that mutates HRM data is opt-in via HR_BOT_MCP_ALLOW_WRITE=true,
 * so a casual chat message can never clock someone in or approve a leave.
 */
const READ_ONLY_TOOLS = new Set([
  'get_current_user_profile',
  'check_permission',
  'list_tasks',
  'get_leaves',
  'get_attendance_records',
  'search_employees',
  'get_departments',
  'get_notices',
]);

const MAX_TOOL_OUTPUT_CHARS = 6000;

function extractText(result: unknown): string {
  const content = (result as { content?: Array<{ type?: string; text?: string }> })?.content;
  if (Array.isArray(content)) {
    const text = content
      .filter((item) => item?.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
      .trim();
    if (text) return text;
  }
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

/**
 * Opens an in-process MCP connection to the NexusHR MCP server and exposes its
 * tools in the shape the LLM expects. The tools hit MongoDB through the exact
 * same permission matrix used by the web app, scoped to the calling user.
 *
 * Call `close()` when done to release both ends of the linked transport.
 */
export async function createHrBotToolkit(userContext: UserContext): Promise<HrBotToolkit> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const server = createNexusMcpServer();
  const client = new Client({ name: 'nexi-hr-bot', version: '1.0.0' });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const allowWrites = process.env.HR_BOT_MCP_ALLOW_WRITE === 'true';

  const { tools } = await client.listTools();
  const available = tools.filter((tool) => allowWrites || READ_ONLY_TOOLS.has(tool.name));
  const availableNames = new Set(available.map((tool) => tool.name));

  const definitions: HrBotToolDefinition[] = available.map((tool) => ({
    name: tool.name,
    description: tool.description || tool.name.replace(/_/g, ' '),
    parameters: (tool.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} },
  }));

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.allSettled([client.close(), server.close()]);
  };

  return {
    definitions,
    close,
    call: async (name, args) => {
      if (!availableNames.has(name)) {
        return { text: `Tool "${name}" is not available to Nexi.`, isError: true };
      }

      try {
        // Run inside the MCP request context so `resolveUserContext()` inside the
        // tools resolves to the employee who is chatting — no token juggling.
        const result = await mcpContextStorage.run({ userContext }, () =>
          client.callTool({ name, arguments: args })
        );

        let text = extractText(result);
        if (text.length > MAX_TOOL_OUTPUT_CHARS) {
          text = `${text.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n…(truncated)`;
        }

        return { text, isError: Boolean((result as { isError?: boolean }).isError) };
      } catch (err: any) {
        return {
          text: `Tool "${name}" failed: ${err?.message || 'unknown error'}`,
          isError: true,
        };
      }
    },
  };
}
