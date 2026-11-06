import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createNexusMcpServer } from '@/mcp-server/factory';
import { resolveUserContext, mcpContextStorage, UserContext } from '@/mcp-server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SessionData {
  transport: WebStandardStreamableHTTPServerTransport;
  userContext?: UserContext;
  token?: string;
  lastActive: number;
}

// In-memory sessions store for streamable HTTP & SSE connections
const sessions = new Map<string, SessionData>();
const SESSION_TTL_MS = 30 * 60 * 1000;

function cleanupStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      session.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}

function extractToken(req: Request): string | undefined {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token') || url.searchParams.get('auth');
  if (queryToken) return queryToken;

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1];
    return authHeader;
  }

  const customHeader = req.headers.get('x-nexus-auth-token') || req.headers.get('x-mcp-token');
  if (customHeader) return customHeader;

  return undefined;
}

function applyCors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-nexus-auth-token, x-mcp-token, mcp-session-id, mcp-protocol-version, Last-Event-ID, Accept'
  );
  res.headers.set('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
  return res;
}

export async function OPTIONS() {
  return applyCors(new Response(null, { status: 204 }));
}

export async function GET(req: Request) {
  cleanupStaleSessions();
  const accept = req.headers.get('accept') || '';
  const isSSE = accept.includes('text/event-stream');

  // If a standard browser or health check without text/event-stream, return server metadata
  if (!isSSE) {
    return applyCors(
      Response.json({
        status: 'online',
        service: 'NexusHR Remote MCP Server',
        version: '1.0.0',
        transport: 'Streamable HTTP (2025-11-25) & SSE',
        endpoint: '/api/mcp',
        auth: 'Provide Authorization: Bearer <NEXUS_AUTH_TOKEN> or ?token=<NEXUS_AUTH_TOKEN>',
        documentation: 'https://modelcontextprotocol.io',
      })
    );
  }

  const token = extractToken(req);
  let userContext: UserContext | undefined;
  if (token) {
    try {
      userContext = await resolveUserContext(token);
    } catch (e: any) {
      console.warn('[MCP Remote] Auth token resolution error:', e.message);
    }
  }

  const reqSessionId = req.headers.get('mcp-session-id');
  let session = reqSessionId ? sessions.get(reqSessionId) : undefined;

  if (!session) {
    // Generate new session ID for incoming SSE stream
    const newSessionId = crypto.randomUUID();
    const server = createNexusMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });
    await server.connect(transport);

    session = {
      transport,
      userContext,
      token,
      lastActive: Date.now(),
    };
    sessions.set(newSessionId, session);
  } else {
    session.lastActive = Date.now();
    if (token && !session.token) {
      session.token = token;
      session.userContext = userContext;
    }
  }

  const response = await mcpContextStorage.run(
    { token: session.token, userContext: session.userContext },
    async () => session!.transport.handleRequest(req)
  );

  return applyCors(response);
}

export async function POST(req: Request) {
  cleanupStaleSessions();
  const token = extractToken(req);
  let userContext: UserContext | undefined;
  if (token) {
    try {
      userContext = await resolveUserContext(token);
    } catch (e: any) {
      console.warn('[MCP Remote] Auth token resolution error:', e.message);
    }
  }

  const reqSessionId = req.headers.get('mcp-session-id');
  let session = reqSessionId ? sessions.get(reqSessionId) : undefined;

  if (!session) {
    // Fresh session for initialize or stateless request
    const newSessionId = crypto.randomUUID();
    const server = createNexusMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });
    await server.connect(transport);

    session = {
      transport,
      userContext,
      token,
      lastActive: Date.now(),
    };
    sessions.set(newSessionId, session);
  } else {
    session.lastActive = Date.now();
    if (token && !session.token) {
      session.token = token;
      session.userContext = userContext;
    }
  }

  const response = await mcpContextStorage.run(
    { token: session.token, userContext: session.userContext },
    async () => session!.transport.handleRequest(req)
  );

  return applyCors(response);
}

export async function DELETE(req: Request) {
  const reqSessionId = req.headers.get('mcp-session-id');
  if (reqSessionId && sessions.has(reqSessionId)) {
    const session = sessions.get(reqSessionId);
    if (session) {
      await session.transport.close().catch(() => {});
      sessions.delete(reqSessionId);
    }
    return applyCors(Response.json({ success: true, message: 'Session closed' }));
  }

  return applyCors(Response.json({ error: 'Session not found' }, { status: 404 }));
}