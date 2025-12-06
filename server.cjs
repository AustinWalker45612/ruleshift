// server.cjs
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;

// Create bare HTTP server (no Express needed)
const server = http.createServer();

// Socket.IO instance
const io = new Server(server, {
  cors: {
    origin: "*", // fine for dev; you can lock this down later to your frontend URL
    methods: ["GET", "POST"],
  },
});

/**
 * In-memory per-room data:
 * rooms = Map<roomId, {
 *   latestState: object | null,
 *   seats: {
 *     0: { clientId: string, socketId: string, connected: boolean } | null,
 *     1: { clientId: string, socketId: string, connected: boolean } | null,
 *   },
 *   spectators: Map<clientId, Set<socketId>>,
 * }>
 */
const rooms = new Map();

/**
 * Track which socket belongs to which (roomId, clientId, seatIndex)
 * clientSessions = Map<socketId, { roomId, clientId, seatIndex: 0|1|null }>
 */
const clientSessions = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      latestState: null,
      seats: {
        0: null,
        1: null,
      },
      spectators: new Map(),
    });
  }
  return rooms.get(roomId);
}

function emitRoomPresence(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const seatsPayload = [0, 1].map((idx) => {
    const seat = room.seats[idx];
    if (!seat) {
      return {
        seatIndex: idx,
        occupied: false,
        clientId: null,
        connected: false,
      };
    }
    return {
      seatIndex: idx,
      occupied: true,
      clientId: seat.clientId,
      connected: seat.connected,
    };
  });

  const spectatorsCount = room.spectators.size;

  io.to(roomId).emit("room:presence", {
    roomId,
    seats: seatsPayload,
    spectatorsCount,
  });
}

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // ---- ROOM JOIN + SEAT ASSIGNMENT ----
  socket.on("room:join", (payload) => {
    const { roomId, clientId } = payload || {};
    if (!roomId || !clientId) {
      console.warn("⚠️ room:join missing roomId or clientId", payload);
      return;
    }

    const normalizedRoomId = String(roomId).toUpperCase();
    const room = getOrCreateRoom(normalizedRoomId);

    socket.join(normalizedRoomId);

    // Try to reclaim existing seat for this clientId
    let seatIndex = null;

    for (const idx of [0, 1]) {
      const seat = room.seats[idx];
      if (seat && seat.clientId === clientId) {
        seatIndex = idx;
        seat.socketId = socket.id;
        seat.connected = true;
        break;
      }
    }

    // If not already bound to a seat, assign first free seat
    if (seatIndex === null) {
      if (!room.seats[0]) {
        seatIndex = 0;
        room.seats[0] = {
          clientId,
          socketId: socket.id,
          connected: true,
        };
      } else if (!room.seats[1]) {
        seatIndex = 1;
        room.seats[1] = {
          clientId,
          socketId: socket.id,
          connected: true,
        };
      } else {
        // No seats free -> spectator
        seatIndex = null;
        if (!room.spectators.has(clientId)) {
          room.spectators.set(clientId, new Set());
        }
        room.spectators.get(clientId).add(socket.id);
      }
    }

    clientSessions.set(socket.id, {
      roomId: normalizedRoomId,
      clientId,
      seatIndex,
    });

    console.log(
      `👥 room:join -> room=${normalizedRoomId}, clientId=${clientId}, seatIndex=${seatIndex}`
    );

    // Tell this socket what seat it has
    socket.emit("room:joined", {
      roomId: normalizedRoomId,
      clientId,
      seatIndex,
    });

    // Broadcast updated presence to everyone in the room
    emitRoomPresence(normalizedRoomId);

    // If we already have a latestState for this room, send it to the new client
    const latestState = room.latestState;
    if (latestState) {
      socket.emit("game:state", {
        ...latestState,
        sender: undefined,
      });
    }
  });

  // ---- GAME STATE SNAPSHOTS (per-room) ----
  socket.on("game:state", (payload) => {
    const { roomId } = payload || {};
    if (!roomId) {
      console.warn("⚠️ game:state payload without roomId");
      return;
    }

    const normalizedRoomId = String(roomId).toUpperCase();
    const room = getOrCreateRoom(normalizedRoomId);

    console.log("📩 Received game:state from", socket.id, "for room", normalizedRoomId);

    // Store a clean copy as the "authoritative" latest state for this room
    const latestState = { ...payload };
    delete latestState.sender;
    room.latestState = latestState;

    // Broadcast to all OTHER clients in this room
    socket.to(normalizedRoomId).emit("game:state", {
      ...payload,
      sender: socket.id,
    });
  });

  // ---- STATE REQUEST (per-room) ----
  socket.on("game:requestState", (payload) => {
    const { roomId } = payload || {};
    if (!roomId) {
      console.warn("⚠️ game:requestState without roomId");
      return;
    }

    const normalizedRoomId = String(roomId).toUpperCase();
    const room = rooms.get(normalizedRoomId);

    console.log(
      "🔁",
      socket.id,
      "requested latest game state for room",
      normalizedRoomId
    );

    if (room && room.latestState) {
      socket.emit("game:state", {
        ...room.latestState,
        sender: undefined,
      });
    } else {
      console.log(
        "⚠️ No latestState stored yet for room",
        normalizedRoomId,
        "— probably pre-game"
      );
    }
  });

  // ---- DISCONNECT HANDLING + PRESENCE ----
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    const session = clientSessions.get(socket.id);
    if (!session) return;

    const { roomId, clientId, seatIndex } = session;
    const room = rooms.get(roomId);
    if (!room) {
      clientSessions.delete(socket.id);
      return;
    }

    if (seatIndex === 0 || seatIndex === 1) {
      const seat = room.seats[seatIndex];
      if (seat && seat.socketId === socket.id) {
        // Mark seat as disconnected but keep ownership (we'll decide about timeout/cleanup later)
        seat.connected = false;
      }
    } else {
      // Spectator: remove this socket from the spectator map
      if (room.spectators.has(clientId)) {
        const set = room.spectators.get(clientId);
        set.delete(socket.id);
        if (set.size === 0) {
          room.spectators.delete(clientId);
        }
      }
    }

    clientSessions.delete(socket.id);

    // Notify remaining sockets in the room
    emitRoomPresence(roomId);
  });
});

// IMPORTANT: bind to 0.0.0.0 so phones on the same Wi-Fi can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
