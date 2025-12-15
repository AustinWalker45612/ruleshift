// server.cjs
require("dotenv").config(); // ⬅️ MUST be first

const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

// -------------------- Database --------------------
const { prisma, pool } = require("./src/db.cjs");

// -------------------- Routers --------------------
const { authRouter } = require("./src/routes/auth.routes.cjs");
const { statsRouter } = require("./src/routes/stats.routes.cjs");

// -------------------- Config --------------------
const PORT = process.env.PORT || 10000;
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

const DISCONNECT_GRACE_MS = 60 * 1000;
const ROOM_EXPIRY_MS = 60 * 60 * 1000;
const ROOM_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// -------------------- Express --------------------
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Routes
app.use("/auth", authRouter);
app.use("/stats", statsRouter);

// -------------------- HTTP + Socket.IO --------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// -------------------- Room Store --------------------
const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);

  if (!room) {
    room = {
      roomId,
      state: null,
      seats: [
        { clientId: null, socketId: null, connected: false, disconnectTimer: null, guestName: null },
        { clientId: null, socketId: null, connected: false, disconnectTimer: null, guestName: null },
      ],
      spectators: new Map(),
      lastActivity: Date.now(),
    };
    rooms.set(roomId, room);
    console.log(`Room created: ${roomId}`);
  } else {
    room.lastActivity = Date.now();
  }

  return room;
}

function broadcastPresence(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit("room:presence", {
    roomId,
    seats: room.seats.map((seat, index) => ({
      seatIndex: index,
      occupied: !!seat.clientId,
      clientId: seat.clientId,
      connected: seat.connected,
    })),
    spectatorsCount: room.spectators.size,
  });
}

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const anyConnected =
      room.seats.some((s) => s.connected) ||
      [...room.spectators.values()].some((s) => s.connected);

    if (!anyConnected && now - room.lastActivity > ROOM_EXPIRY_MS) {
      room.seats.forEach((s) => s.disconnectTimer && clearTimeout(s.disconnectTimer));
      rooms.delete(roomId);
      console.log(`Room expired: ${roomId}`);
    }
  }
}, ROOM_SWEEP_INTERVAL_MS);

// -------------------- DB Helper --------------------
async function upsertPlayer({ clientId, name }) {
  if (!clientId || !name) return null;

  return prisma.player.upsert({
    where: { clientId },
    update: { name },
    create: { clientId, name },
  });
}

// -------------------- Socket Events --------------------
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("room:join", (payload) => {
    if (!payload?.roomId || !payload?.clientId) return;

    const roomId = String(payload.roomId).toUpperCase();
    const clientId = String(payload.clientId).trim();
    const guestName = payload.guestName?.trim() || null;

    const room = getOrCreateRoom(roomId);
    socket.join(roomId);

    let seatIndex = room.seats.findIndex((s) => s.clientId === clientId);
    if (seatIndex === -1) {
      seatIndex = room.seats.findIndex((s) => !s.clientId);
    }

    if (seatIndex === -1) {
      room.spectators.set(clientId, { socketId: socket.id, connected: true, guestName });
      socket.emit("room:joined", { roomId, clientId, seatIndex: null });
      broadcastPresence(roomId);
      return;
    }

    const seat = room.seats[seatIndex];
    seat.clientId = clientId;
    seat.socketId = socket.id;
    seat.connected = true;
    seat.guestName = guestName;

    socket.emit("room:joined", { roomId, clientId, seatIndex });
    broadcastPresence(roomId);
  });

  socket.on("player:upsert", async ({ clientId, name }) => {
    try {
      await upsertPlayer({ clientId, name });
    } catch (err) {
      console.error("player:upsert error:", err);
    }
  });

  socket.on("game:state", (payload) => {
    if (!payload?.roomId) return;
    const roomId = String(payload.roomId).toUpperCase();
    const room = getOrCreateRoom(roomId);

    room.state = { ...payload, sender: undefined };
    room.lastActivity = Date.now();

    socket.to(roomId).emit("game:state", {
      ...payload,
      sender: socket.id,
    });
  });

  socket.on("game:requestState", ({ roomId }) => {
    const room = rooms.get(String(roomId).toUpperCase());
    if (room?.state) socket.emit("game:state", room.state);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      room.seats.forEach((seat, idx) => {
        if (seat.socketId === socket.id) {
          seat.connected = false;
          seat.socketId = null;
          seat.disconnectTimer = setTimeout(() => {
            if (!seat.connected) {
              room.seats[idx] = { clientId: null, socketId: null, connected: false, disconnectTimer: null, guestName: null };
              broadcastPresence(roomId);
            }
          }, DISCONNECT_GRACE_MS);
        }
      });

      for (const [cid, spec] of room.spectators.entries()) {
        if (spec.socketId === socket.id) room.spectators.delete(cid);
      }
    }
  });
});

// -------------------- Shutdown --------------------
async function shutdown() {
  console.log("Shutting down...");
  await prisma.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// -------------------- Listen --------------------
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
});
