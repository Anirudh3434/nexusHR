const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || '';
const SOCKET_EMIT_SECRET = process.env.SOCKET_EMIT_SECRET || '';

/**
 * Push a real-time event to a Socket.IO room via the standalone socket server.
 * This is a fire-and-forget HTTP call — failures are silently logged and ignored.
 */
export async function emitToRoom(room: string, event: string, data: any): Promise<void> {
  if (!SOCKET_SERVER_URL) {
    // Fallback: try the in-process io (for local dev with server.ts)
    const io = (global as any).io;
    if (io) {
      try { io.to(room).emit(event, data); } catch {}
    }
    return;
  }

  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SOCKET_EMIT_SECRET ? { Authorization: `Bearer ${SOCKET_EMIT_SECRET}` } : {}),
      },
      body: JSON.stringify({ room, event, data }),
    });

    if (!res.ok) {
      console.warn(`[Socket] /emit failed (${res.status}) for event=${event} room=${room}`);
    }
  } catch (err) {
    // Silently ignore — real-time sync is best-effort
    console.warn('[Socket] /emit unreachable:', (err as Error).message);
  }
}
