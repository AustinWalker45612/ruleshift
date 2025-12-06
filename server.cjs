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

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Client pushes a new game state snapshot
  socket.on("game:state", (payload) => {
    // payload is the SyncedState coming from the client, including roomId and sender
    const roomId = payload && payload.roomId ? String(payload.roomId) : "default";
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
    // For now we don't clear roomStates on disconnect.
    // State stays alive so reconnects / new clients can see the last game.
  });
});

// IMPORTANT: bind to 0.0.0.0 so phones on the same Wi-Fi can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
