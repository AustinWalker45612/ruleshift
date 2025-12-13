// server.cjs
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
require("dotenv").config();

// ✅ Auth router (new)
const { createAuthRouter } = require("./src/routes/auth.routes.cjs");

const { prisma, pool } = require("./src/db.cjs");

// -------------------- Config --------------------
const PORT = process.env.PORT || 4000;
const DISCONNECT_GRACE_MS = 60 * 1000;
const ROOM_EXPIRY_MS = 60 * 60 * 1000;
const ROOM_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// IMPORTANT: for cookies, origin cannot be "*"
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_change_me";

const IS_PROD = process.env.NODE_ENV === "production";
const AUTH_COOKIE_NAME = "rs_token";

// -------------------- Express (HTTP API) --------------------
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

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ Mount auth routes (/auth/register, /auth/login, /auth/me, /auth/logout)
app.use("/auth", authRouter);

// -------------------- HTTP server (Express + Socket.IO) --------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// -------------------- Room store --------------------
const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);

  if (!room) {
    room = {
      roomId,
      state: null,
      seats: [
        {
          clientId: null,
          socketId: null,
          connected: false,
          disconnectTimer: null,
          guestName: null,
        },
        {
          clientId: null,
          socketId: null,
          connected: false,
          disconnectTimer: null,
          guestName: null,
        },
      ],
      // spectators: clientId -> { socketId, connected, guestName }
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
      connected: !!seat.connected,
    })),
    spectatorsCount: room.spectators.size,
  });
}

function cleanupExpiredRooms() {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    const anySeatConnected = room.seats.some((s) => s.connected);
    const anySpectatorConnected = [...room.spectators.values()].some(
      (s) => s.connected
    );

    if (!anySeatConnected && !anySpectatorConnected) {
      if (now - room.lastActivity > ROOM_EXPIRY_MS) {
        room.seats.forEach(
          (seat) => seat.disconnectTimer && clearTimeout(seat.disconnectTimer)
        );
        rooms.delete(roomId);
      }
    }
  }
}

setInterval(cleanupExpiredRooms, ROOM_SWEEP_INTERVAL_MS);

// -------------------- Database helper (existing) --------------------
async function upsertPlayer({ clientId, name }) {
  if (!clientId || !name) return null;

  const now = new Date();

  return prisma.player.upsert({
    where: { clientId },                // ✅ unique field
    update: { name, updatedAt: now },
    create: {
      clientId,                         // ✅ store device id here
      name,
      createdAt: now,
      updatedAt: now,
      duelsPlayed: 0,
      duelsWon: 0,
      totalXp: 0,
    },
  });
}


// ---------- Seat helpers ----------
function normalizeJoinMode(mode) {
  if (mode === "spectator") return "spectator";
  if (mode === "player") return "player";
  return null;
}

function clearSeat(room, seatIndex) {
  const seat = room.seats[seatIndex];
  if (!seat) return;

  if (seat.disconnectTimer) {
    clearTimeout(seat.disconnectTimer);
    seat.disconnectTimer = null;
  }

  seat.clientId = null;
  seat.socketId = null;
  seat.connected = false;
  seat.guestName = null;
}

function assignSeat(room, seatIndex, { clientId, socketId, guestName }) {
  const seat = room.seats[seatIndex];
  seat.clientId = clientId;
  seat.socketId = socketId;
  seat.connected = true;
  seat.guestName = guestName || seat.guestName || null;

  if (seat.disconnectTimer) {
    clearTimeout(seat.disconnectTimer);
    seat.disconnectTimer = null;
  }
}

// -------------------- Socket handlers --------------------
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("room:join", (payload) => {
    if (!payload) return;
    let { roomId, clientId, mode, guestName } = payload;
    if (!roomId || !clientId) return;

    roomId = String(roomId).toUpperCase().trim();
    clientId = String(clientId).trim();
    const joinMode = normalizeJoinMode(mode);
    const cleanGuestName = typeof guestName === "string" ? guestName.trim() : "";

    const room = getOrCreateRoom(roomId);
    socket.join(roomId);

    // Always remove any old spectator record for this clientId when they join (we’ll re-add if needed).
    if (room.spectators.has(clientId)) {
      room.spectators.delete(clientId);
    }

    // If they explicitly chose spectator, do not claim a seat.
    if (joinMode === "spectator") {
      const prevSeatIndex = room.seats.findIndex((s) => s.clientId === clientId);
      if (prevSeatIndex !== -1) {
        clearSeat(room, prevSeatIndex);
      }

      room.spectators.set(clientId, {
        socketId: socket.id,
        connected: true,
        guestName: cleanGuestName || null,
      });

      room.lastActivity = Date.now();

      socket.emit("room:joined", {
        roomId,
        clientId,
        seatIndex: null,
      });

      broadcastPresence(roomId);
      return;
    }

    // Player join (default behavior)
    // 1) If this clientId already owns a seat, reattach to that seat (prevents seat swapping on refresh).
    let seatIndex = room.seats.findIndex((seat) => seat.clientId === clientId);

    // 2) Otherwise claim an empty seat.
    if (seatIndex === -1) {
      if (!room.seats[0].clientId) seatIndex = 0;
      else if (!room.seats[1].clientId) seatIndex = 1;
    }

    // 3) If still no seat, spectator.
    if (seatIndex === -1) {
      room.spectators.set(clientId, {
        socketId: socket.id,
        connected: true,
        guestName: cleanGuestName || null,
      });

      room.lastActivity = Date.now();

      socket.emit("room:joined", {
        roomId,
        clientId,
        seatIndex: null,
      });

      broadcastPresence(roomId);
      return;
    }

    // Assign / reattach seat
    assignSeat(room, seatIndex, {
      clientId,
      socketId: socket.id,
      guestName: cleanGuestName || null,
    });

    room.lastActivity = Date.now();

    socket.emit("room:joined", {
      roomId,
      clientId,
      seatIndex,
    });

    broadcastPresence(roomId);
  });

  socket.on("player:upsert", async (payload) => {
    if (!payload) return;
    const { clientId, name } = payload;
    if (!clientId || !name) return;

    try {
      await upsertPlayer({ clientId, name });
    } catch (err) {
      console.error("player:upsert error:", err);
    }
  });

  socket.on("game:state", (payload) => {
    if (!payload || !payload.roomId) return;

    const roomId = String(payload.roomId).toUpperCase();
    const room = getOrCreateRoom(roomId);

    const cleanState = { ...payload };
    delete cleanState.sender;

    room.state = cleanState;
    room.lastActivity = Date.now();

    socket.to(roomId).emit("game:state", {
      ...payload,
      sender: socket.id,
    });
  });

  socket.on("game:requestState", (payload) => {
    if (!payload || !payload.roomId) return;

    const roomId = String(payload.roomId).toUpperCase();
    const room = rooms.get(roomId);

    if (room?.state) {
      socket.emit("game:state", { ...room.state });
    }
  });

  socket.on("disconnect", () => {
    const now = Date.now();

    for (const [roomId, room] of rooms.entries()) {
      let changed = false;

      // Seats: mark disconnected and start grace timer to free seat if they don’t come back.
      room.seats.forEach((seat, index) => {
        if (seat.socketId === socket.id) {
          seat.connected = false;
          seat.socketId = null;

          if (seat.disconnectTimer) {
            clearTimeout(seat.disconnectTimer);
            seat.disconnectTimer = null;
          }

          seat.disconnectTimer = setTimeout(() => {
            const r = rooms.get(roomId);
            if (!r) return;

            const s = r.seats[index];
            if (!s) return;

            // Only clear if still not connected (prevents seat loss on quick reconnect).
            if (!s.connected) {
              clearSeat(r, index);
              broadcastPresence(roomId);
            }
          }, DISCONNECT_GRACE_MS);

          changed = true;
        }
      });

      // Spectators: remove immediately.
      for (const [clientId, spec] of room.spectators.entries()) {
        if (spec.socketId === socket.id) {
          room.spectators.delete(clientId);
          changed = true;
        }
      }

      if (changed) {
        room.lastActivity = now;
        broadcastPresence(roomId);
      }
    }
  });
});

// -------------------- Graceful shutdown --------------------
async function shutdown() {
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
});
