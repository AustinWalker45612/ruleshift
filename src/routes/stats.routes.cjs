// src/routes/stats.routes.cjs
const express = require("express");
const { prisma } = require("../db.cjs");
const { requireAuth } = require("../middleware/requireAuth.cjs");

const router = express.Router();

/**
 * Body:
 * {
 *   scoreEarned: number,  // points this logged-in user earned this duel
 *   outcome: "WIN" | "LOSS",
 *   duelKey?: string      // optional idempotency key from client
 * }
 */
router.post("/duel/complete", requireAuth, async (req, res) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const scoreEarnedRaw = req.body?.scoreEarned;
    const outcome = String(req.body?.outcome || "").toUpperCase();
    const duelKey = String(req.body?.duelKey || "").trim();

    const scoreEarned = Number(scoreEarnedRaw);
    if (!Number.isFinite(scoreEarned) || scoreEarned < 0) {
      return res.status(400).json({ error: "scoreEarned must be a number >= 0" });
    }
    if (outcome !== "WIN" && outcome !== "LOSS") {
      return res.status(400).json({ error: 'outcome must be "WIN" or "LOSS"' });
    }

    // ✅ Minimal idempotency (optional but helpful):
    // If you want this to be real, you should store duelKey server-side in a DuelResult table.
    // For now, we just accept it and let client handle "call once".
    // (Keeping it lightweight to match your current setup.)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        totalScore: { increment: Math.floor(scoreEarned) },
        duelsPlayed: { increment: 1 },
        duelsWon: outcome === "WIN" ? { increment: 1 } : undefined,
        duelsLost: outcome === "LOSS" ? { increment: 1 } : undefined,
      },
      select: {
        id: true,
        displayName: true,
        totalScore: true,
        duelsPlayed: true,
        duelsWon: true,
        duelsLost: true,
      },
    });

    return res.status(200).json({ ok: true, user: updated, duelKey: duelKey || null });
  } catch (err) {
    console.error("stats duel/complete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { statsRouter: router };
