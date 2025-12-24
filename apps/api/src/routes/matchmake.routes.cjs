// src/routes/matchmake.routes.cjs
const express = require("express");
const { prisma } = require("../db.cjs");

const router = express.Router();

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/1/0
  let id = "";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// Try a few times to avoid edge races / uniqueness collisions.
async function claimOrCreateRoom() {
  // 1) Try to claim an existing WAITING room (oldest first)
  // We do an optimistic "updateMany where status=WAITING" to prevent double-claims.
  for (let attempt = 0; attempt < 6; attempt++) {
    const waiting = await prisma.matchmakingRoom.findFirst({
      where: { status: "WAITING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, roomId: true },
    });

    if (waiting) {
      const res = await prisma.matchmakingRoom.updateMany({
        where: { id: waiting.id, status: "WAITING" },
        data: { status: "MATCHED", matchedAt: new Date() },
      });

      if (res.count === 1) {
        return { roomId: waiting.roomId, didMatchExisting: true };
      }

      // someone else claimed it first — retry
      continue;
    }

    // 2) No waiting room: create a new one
    for (let c = 0; c < 6; c++) {
      const roomId = generateRoomId();
      try {
        await prisma.matchmakingRoom.create({
          data: { roomId, status: "WAITING" },
        });
        return { roomId, didMatchExisting: false };
      } catch (e) {
        // likely unique constraint collision on roomId — try again
        continue;
      }
    }

    // If we somehow failed to create after collisions, loop outer attempts.
  }

  throw new Error("Unable to matchmake right now");
}

// POST /matchmake  -> { roomId }
router.post("/", async (_req, res) => {
  try {
    const { roomId } = await claimOrCreateRoom();
    return res.status(200).json({ roomId });
  } catch (err) {
    console.error("matchmake error:", err);
    return res.status(500).json({ error: "Matchmaking failed" });
  }
});

// POST /matchmake/leave  body: { roomId }  -> ok
router.post("/leave", async (req, res) => {
  try {
    const roomId = String(req.body?.roomId || "").trim().toUpperCase();
    if (!roomId) return res.status(400).json({ error: "roomId is required" });

    // Only abandon if still WAITING. If already MATCHED, leave is a no-op.
    await prisma.matchmakingRoom.updateMany({
      where: { roomId, status: "WAITING" },
      data: { status: "ABANDONED", abandonedAt: new Date() },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("matchmake leave error:", err);
    return res.status(500).json({ error: "Leave failed" });
  }
});

module.exports = { matchmakeRouter: router };
