// server.cjs
const http = require("http");
const { Server } = require("socket.io");

// ---- Prisma setup (Prisma 7 + Postgres adapter) ----
require("dotenv").config();

// ✅ use the generated Prisma client instead of @prisma/client
const { PrismaClient } = require("./src/generated/client.js");

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️ DATABASE_URL is not set. Prisma will fail to connect to the database."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});
// ----------------------------------------------------

const PORT = process.env.PORT || 4000;

// How long a disconnected player keeps their seat reserved (ms)
const DISCONNECT_GRACE_MS = 60 * 1000; // 1 minute

// How long an empty/inactive room lives before being cleaned up (ms)
const ROOM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// How often to sweep for expired rooms (ms)
const ROOM_SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Create bare HTTP server
const server = http.createServer();

// Socket.IO instance
const io = new Server(server, {
  cors: {
    origin: "*", // fine for dev; later restrict to frontend origin
    methods: ["GET", "POST"],
  },
});

/**
 * rooms: Map<roomId, Room>
 *
 * Room = {
 *   roomId: string,
 *   state: SyncedState | null,
 *   seats: [
 *     { clientId, socketId, connected, disconnectTimer },
 *     { clientId, socketId, connected, disconnectTimer },
 *   ],
 *   spectators: Map<clientId, { socketId, connected }>,
 *   lastActivity: number,
 * }
 */
const rooms = new Map();

/**
 * Ensure a room object exists and bump its lastActivity.
 */
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
        },
        {
          clientId: null,
          socketId: null,
          connected: false,
          disconnectTimer: null,
        },
      ],
      spectators: new Map(), // clientId -> { socketId, connected }
      lastActivity: Date.now(),
    };
    rooms.set(roomId, room);
    console.log(`🆕 Created room ${roomId}`);
  } else {
    room.lastActivity = Date.now();
  }
  return room;
}

/**
 * Broadcast presence info for a room to all sockets in that room.
 */
function broadcastPresence(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = {
    roomId,
    seats: room.seats.map((seat, index) => ({
      seatIndex: index,
      occupied: !!seat.clientId,
      clientId: seat.clientId,
      connected: !!seat.connected,
    })),
    spectatorsCount: room.spectators.size,
  };

  io.to(roomId).emit("room:presence", payload);
}

/**
 * Periodic cleanup of rooms with no active connections and long inactivity.
 */
function cleanupExpiredRooms() {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    const anySeatConnected = room.seats.some((s) => s.connected);
    const anySpectatorConnected = Array.from(room.spectators.values()).some(
      (s) => s.connected
    );

    if (!anySeatConnected && !anySpectatorConnected) {
      const age = now - room.lastActivity;
      if (age > ROOM_EXPIRY_MS) {
        // Clear any pending disconnect timers
        room.seats.forEach((seat) => {
          if (seat.disconnectTimer) {
            clearTimeout(seat.disconnectTimer);
          }
        });

        rooms.delete(roomId);
        console.log(
          `🧹 Removed inactive room ${roomId} (no connections for ${Math.round(
            age / 60000
          )} minutes)`
        );
      }
    }
  }
}

setInterval(cleanupExpiredRooms, ROOM_SWEEP_INTERVAL_MS);

// Small helper so we don’t duplicate logic
async function upsertPlayer({ clientId, name }) {
  if (!clientId || !name) {
    console.warn("upsertPlayer missing data", { clientId, name });
    return null;
  }

  // `id` is the primary key; we use clientId as that stable id
  const player = await prisma.player.upsert({
    where: { id: clientId },
    update: {
      name,
      // updatedAt is handled automatically by @updatedAt in the schema
    },
    create: {
      id: clientId,
      name,
      // totalXp, duelsPlayed, duelsWon all use defaults in schema
    },
  });

  return player;
}


io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  /**
   * room:join
   * payload: { roomId, clientId }
   *
   * Assign a seat if possible; otherwise mark as spectator.
   */
  socket.on("room:join", (payload) => {
    if (!payload) return;
    let { roomId, clientId } = payload;
    if (!roomId || !clientId) return;

    roomId = String(roomId).toUpperCase();
    clientId = String(clientId);

    const room = getOrCreateRoom(roomId);

    // Join Socket.IO room for scoping events
    socket.join(roomId);

    // Check if this client already owns a seat in this room
    let seatIndex = room.seats.findIndex(
      (seat) => seat.clientId === clientId
    );

    // If not, see if we can assign a free seat
    if (seatIndex === -1) {
      if (!room.seats[0].clientId) {
        seatIndex = 0;
      } else if (!room.seats[1].clientId) {
        seatIndex = 1;
      }
    }

    if (seatIndex === -1) {
      // Both seats taken → client is a spectator
      room.spectators.set(clientId, {
        socketId: socket.id,
        connected: true,
      });
      console.log(
        `👀 Client ${clientId} joined room ${roomId} as spectator (socket ${socket.id})`
      );
    } else {
      const seat = room.seats[seatIndex];

      // Assign/refresh this seat
      seat.clientId = clientId;
      seat.socketId = socket.id;
      seat.connected = true;

      // Cancel any disconnect timer for this seat
      if (seat.disconnectTimer) {
        clearTimeout(seat.disconnectTimer);
        seat.disconnectTimer = null;
      }

      console.log(
        `🎮 Client ${clientId} joined room ${roomId} as Player ${
          seatIndex + 1
        } (socket ${socket.id})`
      );
    }

    room.lastActivity = Date.now();

    // Notify this socket which seat it got (or null if spectator)
    socket.emit("room:joined", {
      roomId,
      clientId,
      seatIndex: seatIndex === -1 ? null : seatIndex,
    });

    // Broadcast updated presence
    broadcastPresence(roomId);
  });

  /**
   * player:upsert
   * payload: { clientId, name }
   *
   * Save or update a player record in the database.
   */
  socket.on("player:upsert", async (payload) => {
    try {
      console.log("➡️ player:upsert received:", payload);

      const { clientId, name } = payload || {};
      if (!clientId || !name) {
        console.warn("player:upsert missing clientId or name", payload);
        return;
      }

      const player = await upsertPlayer({ clientId, name });

      if (player) {
        console.log("💾 Saved player:", player.id, player.name);
      } else {
        console.warn("⚠️ upsertPlayer returned null for", { clientId, name });
      }
    } catch (err) {
      console.error("❌ Error in player:upsert", err);
    }
  });

  /**
   * game:state
   * payload: SyncedState (must include roomId)
   */
  socket.on("game:state", (payload) => {
    if (!payload || !payload.roomId) return;

    const roomId = String(payload.roomId).toUpperCase();
    const room = getOrCreateRoom(roomId);

    console.log("📩 Received game:state from", socket.id, "for room", roomId);

    // Store a clean copy of the state (without sender) as authoritative
    const cleanState = { ...payload };
    delete cleanState.sender;
    room.state = cleanState;
    room.lastActivity = Date.now();

    // Broadcast to other clients in this room only
    socket.to(roomId).emit("game:state", {
      ...payload,
      sender: socket.id,
    });
  });

  /**
   * game:requestState
   * payload: { roomId }
   */
  socket.on("game:requestState", (payload) => {
    if (!payload || !payload.roomId) return;
    const roomId = String(payload.roomId).toUpperCase();
    const room = rooms.get(roomId);

    console.log("🔁", socket.id, "requested latest game state for room", roomId);

    if (room && room.state) {
      room.lastActivity = Date.now();
      socket.emit("game:state", {
        ...room.state,
        sender: undefined,
      });
    } else {
      console.log(
        `⚠️ No stored state for room ${roomId} yet — probably pre-game or brand new room`
      );
    }
  });

  /**
   * Handle disconnect: mark seats/spectators disconnected and start grace timer
   * before freeing seats.
   */
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    const now = Date.now();

    for (const [roomId, room] of rooms.entries()) {
      let presenceChanged = false;

      // Check if this socket was occupying a seat
      room.seats.forEach((seat, index) => {
        if (seat.socketId === socket.id) {
          // Mark disconnected but keep the clientId for a grace period
          seat.connected = false;
          seat.socketId = null;

          // If there was an existing timer, cancel and replace
          if (seat.disconnectTimer) {
            clearTimeout(seat.disconnectTimer);
          }

          seat.disconnectTimer = setTimeout(() => {
            const r = rooms.get(roomId);
            if (!r) return;
            const s = r.seats[index];

            // Only free if they didn't reconnect in the meantime
            if (!s.connected) {
              console.log(
                `⏱️ Freeing seat ${index} in room ${roomId} after disconnect grace`
              );
              s.clientId = null;
              s.socketId = null;
              s.disconnectTimer = null;
              broadcastPresence(roomId);
            }
          }, DISCONNECT_GRACE_MS);

          presenceChanged = true;
        }
      });

      // Check if this socket was a spectator
      for (const [clientId, spec] of room.spectators.entries()) {
        if (spec.socketId === socket.id) {
          room.spectators.delete(clientId);
          presenceChanged = true;
        }
      }

      if (presenceChanged) {
        room.lastActivity = now;
        broadcastPresence(roomId);
      }
    }
  });
});

// Graceful shutdown
async function shutdown() {
  console.log("\n⏹️ Shutting down server…");
  server.close(() => {
    console.log("HTTP server closed.");
  });
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// IMPORTANT: bind to 0.0.0.0 so phones on the same Wi-Fi can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
