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

// In-memory store of the last known full game state
let latestState = null;

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Client pushes a new game state snapshot
  socket.on("game:state", (payload) => {
    console.log("📩 Received game:state from", socket.id);

    // Store a clean copy as the "authoritative" latest state
    // We don't care who sent it when we replay it later
    latestState = { ...payload };
    delete latestState.sender;

    // Broadcast to all OTHER clients
    socket.broadcast.emit("game:state", {
      ...payload,
      sender: socket.id,
    });
  });

  // New/reconnected client asks for current state
  socket.on("game:requestState", () => {
    console.log("🔁", socket.id, "requested latest game state");
    if (latestState) {
      // Send only to this socket
      socket.emit("game:state", {
        ...latestState,
        sender: undefined,
      });
    } else {
      console.log("⚠️ No latestState stored yet — probably pre-game");
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// IMPORTANT: bind to 0.0.0.0 so phones on the same Wi-Fi can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
