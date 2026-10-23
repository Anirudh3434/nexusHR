const { Server } = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");

const PORT = parseInt(process.env.PORT || "3001", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];
const EMIT_SECRET = process.env.EMIT_SECRET || process.env.SOCKET_EMIT_SECRET || "";

// Fail closed in production only: /emit must have a secret configured.
if (process.env.NODE_ENV === "production" && !EMIT_SECRET) {
  throw new Error("EMIT_SECRET (or SOCKET_EMIT_SECRET) is required in production. Refusing to boot socket-server without it.");
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "";
}

const httpServer = http.createServer((req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, connections: io.engine.clientsCount }));
    return;
  }

  // POST /emit — allows Vercel API routes to push real-time events
  if (req.method === "POST" && req.url === "/emit") {
    if (EMIT_SECRET && req.headers.authorization !== `Bearer ${EMIT_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { room, event, data } = JSON.parse(body);
        if (!room || !event) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "room and event are required" }));
          return;
        }
        io.to(room).emit(event, data || {});
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, room, event }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
  transports: ["websocket", "polling"],
});

// Handshake auth: verify socket.handshake.auth.token via jsonwebtoken (failing closed).
io.use((socket, next) => {
  try {
    const secret = getJwtSecret();
    const token = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
    if (!secret || !token || typeof token !== "string") return next(new Error("Unauthorized"));
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded.id !== "string" || !decoded.id) {
      return next(new Error("Unauthorized"));
    }
    socket.data = socket.data || {};
    socket.data.userId = decoded.id;
    socket.data.role = decoded.role;
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  const ownId = () => socket.data && socket.data.userId;

  // Always joins the authenticated socket's own room; client arg ignored.
  socket.on("join-room", () => {
    const id = ownId();
    if (!id) return;
    socket.join(id);
    console.log(`[Socket] ${socket.id} joined room: ${id}`);
  });

  // Stays open: random 2-min QR tokens, no userId binding.
  socket.on("join-qr-room", (token) => {
    socket.join(token);
    console.log(`[Socket] ${socket.id} joined QR room: ${token}`);
  });

  socket.on("qr-scanned", (data) => {
    console.log(`[Socket] QR scanned for token ${data?.token}`);
    if (data?.token) io.to(data.token).emit("qr-processing");
  });

  socket.on("device-linked", (data) => {
    if (!data?.userId || data.userId !== ownId()) return;
    console.log(`[Socket] Device linked for user ${data?.userId}`);
    io.to(data.userId).emit("device-linked-success", data);
  });

  socket.on("device-update", (data) => {
    if (!data?.userId || data.userId !== ownId()) return;
    io.to(data.userId).emit("device-synced", data.stats);
  });

  socket.on("location-update", (data) => {
    if (!data?.userId || data.userId !== ownId()) return;
    io.to(data.userId).emit("location-synced", data.location);
  });

  socket.on("attendance-update", (data) => {
    if (!data?.userId || data.userId !== ownId()) return;
    io.to(data.userId).emit("attendance-updated", data.attendance);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] ${socket.id} disconnected: ${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(
    `> Socket.IO server ready on port ${PORT} | Origins: ${ALLOWED_ORIGINS.join(", ")}`
  );
});
