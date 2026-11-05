#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before anything else (with quiet: true so stdout is pure JSON-RPC)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import connectDB from '../lib/mongodb';
import { resolveUserContext } from './auth';

import { registerProfileTools } from './tools/profile';
import { registerTaskTools } from './tools/tasks';
import { registerLeaveTools } from './tools/leaves';
import { registerAttendanceTools } from './tools/attendance';
import { registerEmployeeTools } from './tools/employees';
import { registerNoticeTools } from './tools/notices';

async function main() {
  // Ensure database is connected
  try {
    await connectDB();
    const userContext = await resolveUserContext();
    console.error(`[NexusHR MCP] Connected to MongoDB. Authenticated context: ${userContext.name} (${userContext.role}) - ${userContext.email}`);
  } catch (err: any) {
    console.error(`[NexusHR MCP Warning] DB Connection / Auth init: ${err.message}`);
  }

  // Initialize MCP Server
  const server = new McpServer({
    name: 'nexushr-mcp',
    version: '1.0.0',
  });

  // Register all permission-aware tools
  registerProfileTools(server);
  registerTaskTools(server);
  registerLeaveTools(server);
  registerAttendanceTools(server);
  registerEmployeeTools(server);
  registerNoticeTools(server);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[NexusHR MCP] Server running and listening on stdio.');
}

main().catch((error) => {
  console.error('[NexusHR MCP Fatal Error]', error);
  process.exit(1);
});
