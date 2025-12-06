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

// In-memory store of per-room game state
// roomId (string) -> latest SyncedState for that room (without sender)
const roomStates = new Map();

// In-memory mapping of which client occupies which seats in each room
// roomId -> { seats: [clientId | null, clientId | null], spectators: Set<clientId> }
const roomPlayers = new Map();

// Track which socket belongs to which (roomId, clientId) for debugging / future cleanup
// socket.id -> { roomId, clientId }
const socketMeta = new Map();

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // --- ROOM JOIN & SEAT ASSIGNMENT ---
  socket.on("room:join", (payload) => {
    if (!payload) return;

    let { roomId, clientId } = payload;
    if (!roomId || !clientId) {
      console.log("⚠️ room:join missing roomId or clientId from", socket.id);
      return;
    }

    roomId = String(roomId);
    clientId = String(clientId);

    console.log("🧩 room:join", { socketId: socket.id, roomId, clientId });

    socket.join(roomId);
    socketMeta.set(socket.id, { roomId, clientId });

    let info = roomPlayers.get(roomId);
    if (!info) {
      info = {
        seats: [null, null], // index 0 → Player 1, index 1 → Player 2
        spectators: new Set(),
      };
      roomPlayers.set(roomId, info);
    }

    let seatIndex = null;

    // If this clientId already has a seat, reuse it
    if (info.seats[0] === clientId) {
      seatIndex = 0;
    } else if (info.seats[1] === clientId) {
      seatIndex = 1;
    } else if (!info.seats[0]) {
      // First open seat: Player 1
      info.seats[0] = clientId;
      seatIndex = 0;
    } else if (!info.seats[1]) {
      // Second open seat: Player 2
      info.seats[1] = clientId;
      seatIndex = 1;
    } else {
      // No seats left → spectator
      info.spectators.add(clientId);
      seatIndex = null;
    }

    console.log(
      "🎯 Assigned seat",
      seatIndex,
      "for clientId",
      clientId,
      "in room",
      roomId
    );

    socket.emit("room:joined", {
      roomId,
      clientId,
      seatIndex, // 0, 1, or null (spectator)
    });
  });

  // Client pushes a new game state snapshot
  socket.on("game:state", (payload) => {
    if (!payload) return;

    const roomId =
      payload && payload.roomId ? String(payload.roomId) : "default";
    console.log("📩 Received game:state from", socket.id, "for room:", roomId);

    // Make sure this socket is in the room
    socket.join(roomId);

    // Store a clean copy as the "authoritative" latest state for this room
    const latestStateForRoom = { ...payload };
    delete latestStateForRoom.sender; // we don't persist sender
    roomStates.set(roomId, latestStateForRoom);

    // Broadcast to all OTHER clients in this room only
    socket.to(roomId).emit("game:state", {
      ...payload,
      sender: socket.id,
    });
  });

  // New/reconnected client asks for current state
  socket.on("game:requestState", (payload) => {
    const roomId =
      payload && payload.roomId ? String(payload.roomId) : "default";

    console.log(
      "🔁",
      socket.id,
      "requested latest game state for room:",
      roomId
    );

    // Make sure this socket is in the requested room
    socket.join(roomId);

    const latestStateForRoom = roomStates.get(roomId);
    if (latestStateForRoom) {
      // Send only to this socket
      socket.emit("game:state", {
        ...latestStateForRoom,
        sender: undefined,
      });
    } else {
      console.log(
        "⚠️ No state stored yet for room",
        roomId,
        "— probably pre-game"
      );
      // It's fine to do nothing here; client will stay in initial UI state
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    socketMeta.delete(socket.id);
    // For now we keep seat assignments & roomStates so reconnects can reclaim them.
    // Later we could add timeout-based cleanup if needed.
  });
});

// IMPORTANT: bind to 0.0.0.0 so phones on the same Wi-Fi can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
