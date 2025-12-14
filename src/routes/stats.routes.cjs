// src/routes/stats.routes.cjs
const express = require("express");
const { prisma } = require("../db.cjs");
const { getTokenFromReq, verifyToken } = require("../utils/auth.cjs");

const router = express.Router();

function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = verifyToken(token);
    req.userId = decoded?.sub;
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// POST /stats/duel/complete
router.post("/duel/complete", requireAuth, async (req, res) => {
  try {
    const { scoreEarned, outcome, duelKey } = req.body || {};

    if (!duelKey) return res.status(400).json({ error: "Missing duelKey" });
    if (outcome !== "WIN" && outcome !== "LOSS")
      return res.status(400).json({ error: "Invalid outcome" });

    const score = Number(scoreEarned || 0);

    // OPTION A (simple): store as a row in a DuelResult table (recommended)
    // If you don't have this model yet, skip to the "no-db-change" option below.

    const created = await prisma.DuelResult.create({
      data: {
        userId: req.userId,
        duelKey,
        outcome,
        scoreEarned: score,
      },
    });

    return res.status(200).json({ ok: true, id: created.id });
  } catch (err) {
    // If duelKey is unique and already exists, avoid crashing the client
    // (Prisma P2002 unique constraint)
    if (err?.code === "P2002") return res.status(200).json({ ok: true, dup: true });

    console.error("stats/duel/complete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { statsRouter: router };
