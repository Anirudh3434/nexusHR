const { Server } = require("socket.io");
const http = require("http");

const PORT = parseInt(process.env.PORT || "3001", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];
const EMIT_SECRET = process.env.EMIT_SECRET || "";

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

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on("join-room", (userId) => {
    socket.join(userId);
    console.log(`[Socket] ${socket.id} joined room: ${userId}`);
  });

  socket.on("join-qr-room", (token) => {
    socket.join(token);
    console.log(`[Socket] ${socket.id} joined QR room: ${token}`);
  });

  socket.on("qr-scanned", (data) => {
    console.log(`[Socket] QR scanned for token ${data?.token}`);
    if (data?.token) io.to(data.token).emit("qr-processing");
  });

  socket.on("device-linked", (data) => {
    console.log(`[Socket] Device linked for user ${data?.userId}`);
    if (data?.userId) io.to(data.userId).emit("device-linked-success", data);
  });

  socket.on("device-update", (data) => {
    if (data?.userId) io.to(data.userId).emit("device-synced", data.stats);
  });

  socket.on("location-update", (data) => {
    if (data?.userId) io.to(data.userId).emit("location-synced", data.location);
  });

  socket.on("attendance-update", (data) => {
    if (data?.userId)
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
