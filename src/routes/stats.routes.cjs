// src/routes/stats.routes.cjs
const express = require("express");
const { prisma } = require("../db.cjs");
const { verifyToken, getTokenFromReq } = require("../utils/auth.cjs");

const router = express.Router();

// simple auth middleware
function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

router.post("/duel/complete", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { scoreEarned, outcome, duelKey } = req.body;

    if (!userId || !outcome) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    await prisma.duelResult.create({
      data: {
        userId,
        score: scoreEarned ?? 0,
        outcome,
        duelKey,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        duelsPlayed: { increment: 1 },
        duelsWon: outcome === "WIN" ? { increment: 1 } : undefined,
        totalXp: { increment: scoreEarned ?? 0 },
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("stats/duel/complete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = { statsRouter: router };
