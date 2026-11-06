#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before anything else (with quiet: true so stdout is pure JSON-RPC)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import connectDB from '../lib/mongodb';
import { resolveUserContext } from './auth';
import { createNexusMcpServer } from './factory';

async function main() {
  // Ensure database is connected
  try {
    await connectDB();
    const userContext = await resolveUserContext();
    console.error(`[NexusHR MCP] Connected to MongoDB. Authenticated context: ${userContext.name} (${userContext.role}) - ${userContext.email}`);
  } catch (err: any) {
    console.error(`[NexusHR MCP Warning] DB Connection / Auth init: ${err.message}`);
  }

  // Initialize MCP Server with all tools
  const server = createNexusMcpServer();

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[NexusHR MCP] Server running and listening on stdio.');
}

main().catch((error) => {
  console.error('[NexusHR MCP Fatal Error]', error);
  process.exit(1);
});
