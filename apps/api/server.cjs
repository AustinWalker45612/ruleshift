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

// -------------------- Name Moderation (server-side) --------------------
/**
 * Goal:
 * - Hard rules: length + allowed chars + no URLs/emails + no excessive repeats
 * - Blocklist: configurable (JSON file + env var)
 * - Normalization: basic leetspeak + strip punctuation to catch obvious evasion
 *
 * NOTE: We do NOT ship any hate-speech list here. You provide it privately.
 */

function safeString(x) {
  return typeof x === "string" ? x : x == null ? "" : String(x);
}

function collapseSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

function normalizeForMatch(s) {
  // Lowercase, basic leet substitutions, remove non-alphanumerics.
  const lower = s.toLowerCase();
  const leet = lower
    .replace(/[@]/g, "a")
    .replace(/[4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5\$]/g, "s")
    .replace(/[7]/g, "t");
  return leet.replace(/[^a-z0-9]+/g, "");
}

function hashForLogs(s) {
  // Lightweight non-crypto hash to avoid logging raw content
  // (good enough for correlating repeated attempts)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function loadBannedTerms() {
  const terms = new Set();

  // 1) Optional JSON file: ./src/moderation/banned_name_terms.json
  // format: { "terms": ["...", "..."] }  OR  ["...", "..."]
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const file = require("./src/moderation/banned_name_terms.json");
    if (Array.isArray(file)) {
      file.forEach((t) => terms.add(String(t).toLowerCase().trim()));
    } else if (file && Array.isArray(file.terms)) {
      file.terms.forEach((t) => terms.add(String(t).toLowerCase().trim()));
    }
  } catch {
    // ignore if file not present
  }

  // 2) Optional env var BANNED_NAME_TERMS="a,b,c"
  try {
    const env = safeString(process.env.BANNED_NAME_TERMS);
    if (env) {
      env
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .forEach((t) => terms.add(t));
    }
  } catch {
    // ignore
  }

  // Remove empties
  terms.delete("");
  return terms;
}

const BANNED_NAME_TERMS = loadBannedTerms();

// structural rules (don’t allow anything weird)
const NAME_MIN_LEN = Number(process.env.NAME_MIN_LEN || 2);
const NAME_MAX_LEN = Number(process.env.NAME_MAX_LEN || 16);

// Allow letters, numbers, spaces, underscore, dash, dot.
// (Simple and safe. Expand later if you want unicode.)
const ALLOWED_NAME_REGEX = /^[A-Za-z0-9._ -]+$/;

function validatePlayerName(input) {
  const raw = collapseSpaces(safeString(input));
  if (!raw) return { ok: false, reason: "empty" };

  if (raw.length < NAME_MIN_LEN) return { ok: false, reason: "too_short" };
  if (raw.length > NAME_MAX_LEN) return { ok: false, reason: "too_long" };

  if (!ALLOWED_NAME_REGEX.test(raw)) {
    return { ok: false, reason: "invalid_chars" };
  }

  // Prevent obvious spam like "AAAAAAA" / "........"
  if (/(.)\1\1\1/.test(raw)) {
    return { ok: false, reason: "too_repetitive" };
  }

  // No URLs/emails
  const lower = raw.toLowerCase();
  if (lower.includes("http://") || lower.includes("https://") || lower.includes("www.")) {
    return { ok: false, reason: "no_links" };
  }
  if (lower.includes("@")) {
    return { ok: false, reason: "no_emails" };
  }

  // Blocklist check (normalized)
  if (BANNED_NAME_TERMS.size > 0) {
    const norm = normalizeForMatch(raw);
    for (const term of BANNED_NAME_TERMS) {
      if (!term) continue;
      const normTerm = normalizeForMatch(term);
      if (!normTerm) continue;
      if (norm.includes(normTerm)) {
        return { ok: false, reason: "blocked_term" };
      }
    }
  }

  return { ok: true, clean: raw };
}

function sanitizePlayersArray(players) {
  if (!Array.isArray(players)) return players;

  return players.map((p) => {
    const name = p?.name;
    const v = validatePlayerName(name);

    // If invalid, blank it out rather than broadcasting toxicity.
    // Client will still need to enter a valid name.
    const safeName = v.ok ? v.clean : "";

    return {
      ...p,
      name: safeName,
      // If name is invalid, you are not "ready" (prevents auto-start issues)
      ready: v.ok ? !!p?.ready : false,
    };
  });
}

// -------------------- Room Store --------------------
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

    const rawGuestName =
      typeof payload.guestName === "string" ? payload.guestName.trim() : null;

    // Validate guestName (best effort). If invalid, drop it and notify.
    let guestName = null;
    if (rawGuestName) {
      const v = validatePlayerName(rawGuestName);
      if (v.ok) {
        guestName = v.clean;
      } else {
        console.warn(
          `🚫 room:join rejected name hash=${hashForLogs(rawGuestName)} reason=${v.reason} room=${roomId}`
        );
        socket.emit("name:rejected", { reason: v.reason });
      }
    }

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

  // ✅ NEW: explicit leave (used by your Waiting screen "Leave" button)
  socket.on("room:leave", ({ roomId, clientId }) => {
    if (!roomId || !clientId) return;

    const rid = String(roomId).toUpperCase().trim();
    const cid = String(clientId).trim();
    const room = rooms.get(rid);
    if (!room) return;

    // Leave the Socket.IO room
    try {
      socket.leave(rid);
    } catch {
      // ignore
    }

    let changed = false;

    // If this client occupies a seat, clear it immediately (and cancel timers)
    room.seats.forEach((seat, idx) => {
      if (seat.clientId === cid) {
        if (seat.disconnectTimer) clearTimeout(seat.disconnectTimer);

        room.seats[idx] = {
          clientId: null,
          socketId: null,
          connected: false,
          disconnectTimer: null,
          guestName: null,
        };
        changed = true;
      } else if (seat.socketId === socket.id) {
        // Safety: if this socket was mapped but clientId doesn't match, detach socket
        seat.connected = false;
        seat.socketId = null;
        changed = true;
      }
    });

    // If they were a spectator, remove them
    if (room.spectators.has(cid)) {
      room.spectators.delete(cid);
      changed = true;
    } else {
      // Safety: remove spectator entries tied to this socket id
      for (const [specCid, spec] of room.spectators.entries()) {
        if (spec.socketId === socket.id) {
          room.spectators.delete(specCid);
          changed = true;
        }
      }
    }

    if (changed) {
      room.lastActivity = Date.now();
      broadcastPresence(rid);
    }
  });

  socket.on("player:upsert", async ({ clientId, name }) => {
    try {
      const v = validatePlayerName(name);
      if (!v.ok) {
        console.warn(
          `🚫 player:upsert rejected name hash=${hashForLogs(safeString(name))} reason=${v.reason}`
        );
        socket.emit("name:rejected", { reason: v.reason });
        return;
      }

      await upsertPlayer({ clientId, name: v.clean });
    } catch (err) {
      console.error("player:upsert error:", err);
    }
  });

  socket.on("game:state", (payload) => {
    if (!payload?.roomId) return;

    const roomId = String(payload.roomId).toUpperCase().trim();
    const room = getOrCreateRoom(roomId);

    // Sanitize any names inside players[] before storing + rebroadcasting
    const cleanPayload = { ...payload };
    if (cleanPayload.players) {
      cleanPayload.players = sanitizePlayersArray(cleanPayload.players);
    }

    const cleanState = { ...cleanPayload };
    delete cleanState.sender;

    room.state = cleanState;
    room.lastActivity = Date.now();

    socket.to(roomId).emit("game:state", { ...cleanPayload, sender: socket.id });
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
