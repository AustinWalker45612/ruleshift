// server.cjs
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Prisma setup
const { PrismaClient } = require("./src/generated/client.js");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Server config
const PORT = process.env.PORT || 4000;
const DISCONNECT_GRACE_MS = 60 * 1000;
const ROOM_EXPIRY_MS = 60 * 60 * 1000;
const ROOM_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Room store
const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);

  if (!room) {
    room = {
      roomId,
      state: null,
      seats: [
        { clientId: null, socketId: null, connected: false, disconnectTimer: null },
        { clientId: null, socketId: null, connected: false, disconnectTimer: null },
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
      connected: !!seat.connected,
    })),
    spectatorsCount: room.spectators.size,
  });
}

function cleanupExpiredRooms() {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    const anySeatConnected = room.seats.some(s => s.connected);
    const anySpectatorConnected = [...room.spectators.values()].some(s => s.connected);

    if (!anySeatConnected && !anySpectatorConnected) {
      if (now - room.lastActivity > ROOM_EXPIRY_MS) {
        room.seats.forEach(seat => seat.disconnectTimer && clearTimeout(seat.disconnectTimer));
        rooms.delete(roomId);
      }
    }
  }
}

setInterval(cleanupExpiredRooms, ROOM_SWEEP_INTERVAL_MS);

// Database helper
async function upsertPlayer({ clientId, name }) {
  if (!clientId || !name) return null;

  const now = new Date();

  return prisma.player.upsert({
    where: { id: clientId },
    update: { name, updatedAt: now },
    create: {
      id: clientId,
      name,
      createdAt: now,
      updatedAt: now,
      duelsPlayed: 0,
      duelsWon: 0,
      totalXp: 0,
    },
  });
}

// Socket handlers
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("room:join", (payload) => {
    if (!payload) return;
    let { roomId, clientId } = payload;
    if (!roomId || !clientId) return;

    roomId = String(roomId).toUpperCase();
    clientId = String(clientId);

    const room = getOrCreateRoom(roomId);
    socket.join(roomId);

    let seatIndex = room.seats.findIndex(seat => seat.clientId === clientId);

    if (seatIndex === -1) {
      if (!room.seats[0].clientId) seatIndex = 0;
      else if (!room.seats[1].clientId) seatIndex = 1;
    }

    if (seatIndex === -1) {
      room.spectators.set(clientId, { socketId: socket.id, connected: true });
    } else {
      const seat = room.seats[seatIndex];
      seat.clientId = clientId;
      seat.socketId = socket.id;
      seat.connected = true;

      if (seat.disconnectTimer) {
        clearTimeout(seat.disconnectTimer);
        seat.disconnectTimer = null;
      }
    }

    room.lastActivity = Date.now();

    socket.emit("room:joined", {
      roomId,
      clientId,
      seatIndex: seatIndex === -1 ? null : seatIndex,
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

      room.seats.forEach((seat, index) => {
        if (seat.socketId === socket.id) {
          seat.connected = false;
          seat.socketId = null;

          seat.disconnectTimer = setTimeout(() => {
            const r = rooms.get(roomId);
            if (!r) return;
            const s = r.seats[index];

            if (!s.connected) {
              s.clientId = null;
              s.disconnectTimer = null;
              broadcastPresence(roomId);
            }
          }, DISCONNECT_GRACE_MS);

          changed = true;
        }
      });

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

// Graceful shutdown
async function shutdown() {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
