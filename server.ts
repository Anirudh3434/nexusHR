import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./lib/auth";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// CORS origins: explicit allow-list via SOCKET_ALLOWED_ORIGINS (comma list).
// Defaults to reflecting origin in development; same-origin-only fallback
// (localhost:3000) in production. Mobile works via token auth, not origin.
const envOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigin: true | string[] =
  envOrigins.length > 0 ? envOrigins : dev ? true : ["http://localhost:3000"];

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin as any,
      methods: ["GET", "POST"]
    }
  });

  // Export io to global object so Next.js API routes can access it
  (global as any).io = io;

  // Handshake auth: verify Bearer-style token from socket.handshake.auth (failing closed).
  io.use((socket, nextFn) => {
    try {
      const token = (socket.handshake as any)?.auth?.token;
      if (!token || typeof token !== "string") return nextFn(new Error("Unauthorized"));
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      if (!decoded || typeof decoded.id !== "string" || !decoded.id) {
        return nextFn(new Error("Unauthorized"));
      }
      (socket as any).data = (socket as any).data || {};
      (socket as any).data.userId = decoded.id;
      (socket as any).data.role = decoded.role;
      nextFn();
    } catch {
      nextFn(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    const ownId = () => (socket as any).data?.userId as string | undefined;

    // Join a room for the specific user for targeted real-time updates.
    // Always joins the authenticated socket's own room; client arg ignored.
    socket.on("join-room", () => {
      const id = ownId();
      if (!id) return;
      socket.join(id);
      console.log(`Socket ${socket.id} joined User room: ${id}`);
    });

    // Join a room based on the active QR token for instant scan discovery.
    // Stays open: random 2-min tokens, no userId binding.
    socket.on("join-qr-room", (token) => {
      socket.join(token);
      console.log(`Socket ${socket.id} joined QR room: ${token}`);
    });

    // Handle the initial scan discovery (Pre-Verification)
    socket.on("qr-scanned", (data) => {
      const { token } = data;
      console.log(`QR Scanned discovery for token ${token}`);
      io.to(token).emit("qr-processing");
    });

    // Handle instant UI sync for device linking
    socket.on("device-linked", (data) => {
      const { userId, deviceInfo } = data;
      if (userId !== ownId()) return;
      console.log(`Device linked for user ${userId}`);
      io.to(userId).emit("device-linked-success", deviceInfo);
    });

    // Handle real-time device health updates (Battery, Network)
    socket.on("device-update", (data) => {
      const { userId, stats } = data;
      if (userId !== ownId()) return;
      console.log(`Device update for user ${userId}:`, stats);
      // Broadcast to all dashboard clients in the user's room
      io.to(userId).emit("device-synced", stats);
    });

    // Handle real-time location sharing
    socket.on("location-update", (data) => {
      const { userId, location } = data;
      if (userId !== ownId()) return;
      console.log(`Location update for user ${userId}:`, location);
      // Broadcast to all clients in the user's room (the web dashboard)
      io.to(userId).emit("location-synced", location);
    });

    // Handle real-time attendance status
    socket.on("attendance-update", (data) => {
      const { userId, attendance } = data;
      if (userId !== ownId()) return;
      console.log(`Attendance update for user ${userId}:`, attendance);
      // Broadcast to all dashboard clients in the user's room
      io.to(userId).emit("attendance-updated", attendance);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
