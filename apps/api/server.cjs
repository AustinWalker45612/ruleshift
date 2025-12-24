// server.cjs
require("dotenv").config(); // ⬅️ MUST be first

const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
const { matchmakeRouter } = require("./src/routes/matchmake.routes.cjs");


// -------------------- Database --------------------
// ✅ Adapter setup should export { prisma, pool }
const { prisma, pool } = require("./src/db.cjs");

// -------------------- Routers --------------------
const { authRouter } = require("./src/routes/auth.routes.cjs");
const { statsRouter } = require("./src/routes/stats.routes.cjs");

// -------------------- Config --------------------
const PORT = process.env.PORT || 10000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

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

// 🔍 TEMP DEBUG ROUTE (remove after testing)
app.get("/debug/cookies", (req, res) => {
  res.json({
    cookies: req.cookies || null,
    rawHeader: req.headers.cookie || null,
  });
});


// Routes
app.use("/auth", authRouter);
app.use("/stats", statsRouter);
app.use("/matchmake", matchmakeRouter);

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
      spectators: new Map(), // clientId -> { socketId, connected, guestName }
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
      connected: !!seat.connected,
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

  const cleanClientId = String(clientId).trim();
  const cleanName = String(name).trim();
  if (!cleanClientId || !cleanName) return null;

  return prisma.player.upsert({
    where: { clientId: cleanClientId },
    update: { name: cleanName, lastSeenAt: new Date() },
    create: { clientId: cleanClientId, name: cleanName },
  });
}

// -------------------- Socket Events --------------------
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("room:join", (payload) => {
    if (!payload?.roomId || !payload?.clientId) return;

    const roomId = String(payload.roomId).toUpperCase().trim();
    const clientId = String(payload.clientId).trim();
    const guestName =
      typeof payload.guestName === "string" ? payload.guestName.trim() : null;

    const room = getOrCreateRoom(roomId);
    socket.join(roomId);

    // If they were a spectator before, drop that record (we'll re-add if needed).
    if (room.spectators.has(clientId)) room.spectators.delete(clientId);

    // Try to reattach existing seat first (prevents seat swap on refresh)
    let seatIndex = room.seats.findIndex((s) => s.clientId === clientId);

    // Otherwise take empty seat
    if (seatIndex === -1) seatIndex = room.seats.findIndex((s) => !s.clientId);

    // No seats available -> spectator
    if (seatIndex === -1) {
      room.spectators.set(clientId, {
        socketId: socket.id,
        connected: true,
        guestName: guestName || null,
      });

      room.lastActivity = Date.now();
      socket.emit("room:joined", { roomId, clientId, seatIndex: null });
      broadcastPresence(roomId);
      return;
    }

    // Assign seat
    const seat = room.seats[seatIndex];
    seat.clientId = clientId;
    seat.socketId = socket.id;
    seat.connected = true;
    seat.guestName = guestName || seat.guestName || null;

    // Clear any pending disconnect cleanup
    if (seat.disconnectTimer) {
      clearTimeout(seat.disconnectTimer);
      seat.disconnectTimer = null;
    }

    room.lastActivity = Date.now();
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

    const roomId = String(payload.roomId).toUpperCase().trim();
    const room = getOrCreateRoom(roomId);

    const cleanState = { ...payload };
    delete cleanState.sender;

    room.state = cleanState;
    room.lastActivity = Date.now();

    socket.to(roomId).emit("game:state", { ...payload, sender: socket.id });
  });

  socket.on("game:requestState", ({ roomId }) => {
    if (!roomId) return;
    const room = rooms.get(String(roomId).toUpperCase().trim());
    if (room?.state) socket.emit("game:state", room.state);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      let changed = false;

      // seats
      room.seats.forEach((seat, idx) => {
        if (seat.socketId === socket.id) {
          seat.connected = false;
          seat.socketId = null;

          if (seat.disconnectTimer) clearTimeout(seat.disconnectTimer);

          seat.disconnectTimer = setTimeout(() => {
            const latest = rooms.get(roomId);
            if (!latest) return;

            const s = latest.seats[idx];
            if (!s) return;

            if (!s.connected) {
              latest.seats[idx] = {
                clientId: null,
                socketId: null,
                connected: false,
                disconnectTimer: null,
                guestName: null,
              };
              latest.lastActivity = Date.now();
              broadcastPresence(roomId);
            }
          }, DISCONNECT_GRACE_MS);

          changed = true;
        }
      });

      // spectators
      for (const [cid, spec] of room.spectators.entries()) {
        if (spec.socketId === socket.id) {
          room.spectators.delete(cid);
          changed = true;
        }
      }

      if (changed) {
        room.lastActivity = Date.now();
        broadcastPresence(roomId);
      }
    }
  });
});

// -------------------- Startup DB Sanity Check --------------------
async function sanityCheckDb() {
  try {
    // pool check
    await pool.query("SELECT 1");
    console.log("✅ pg Pool can query DB");

    // prisma check
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma can query DB");
  } catch (err) {
    console.error("❌ DB sanity check failed:", err);
  }
}

// -------------------- Shutdown --------------------
async function shutdown() {
  console.log("Shutting down...");
  try {
    await prisma.$disconnect();
  } catch {}
  try {
    await pool.end();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// -------------------- Listen --------------------
server.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
  await sanityCheckDb();
});
