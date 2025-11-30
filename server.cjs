// server.cjs
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;

// Create a bare HTTP server for Socket.IO
const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "*", // you can lock this down later to your frontend URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // When a client sends updated state, broadcast it to everyone else
  socket.on("game:state", (payload) => {
    console.log("📩 Received game:state from", socket.id);

    // Broadcast to all OTHER clients (not the sender)
    socket.broadcast.emit("game:state", {
      ...payload,
      sender: socket.id, // mark who sent it
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// IMPORTANT: bind to 0.0.0.0 so Render and LAN devices can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
