import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow mobile app to connect
      methods: ["GET", "POST"]
    }
  });

  // Export io to global object so Next.js API routes can access it
  (global as any).io = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a room for the specific user for targeted real-time updates
    socket.on("join-room", (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined User room: ${userId}`);
    });

    // Join a room based on the active QR token for instant scan discovery
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
      console.log(`Device linked for user ${userId}`);
      io.to(userId).emit("device-linked-success", deviceInfo);
    });

    // Handle real-time device health updates (Battery, Network)
    socket.on("device-update", (data) => {
      const { userId, stats } = data;
      console.log(`Device update for user ${userId}:`, stats);
      // Broadcast to all dashboard clients in the user's room
      io.to(userId).emit("device-synced", stats);
    });

    // Handle real-time location sharing
    socket.on("location-update", (data) => {
      const { userId, location } = data;
      console.log(`Location update for user ${userId}:`, location);
      // Broadcast to all clients in the user's room (the web dashboard)
      io.to(userId).emit("location-synced", location);
    });

    // Handle real-time attendance status
    socket.on("attendance-update", (data) => {
      const { userId, attendance } = data;
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
