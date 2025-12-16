// src/routes/stats.routes.cjs
const express = require("express");
const { prisma } = require("../db.cjs");
const { getTokenFromReq, verifyToken } = require("../utils/auth.cjs");

const router = express.Router();

// -------------------- Auth middleware --------------------
function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = verifyToken(token);
    const userId = decoded?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    req.userId = userId;
    req.auth = decoded; // optional: { sub, email, displayName, ... }
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// -------------------- Helpers --------------------
function isValidOutcome(outcome) {
  return outcome === "WIN" || outcome === "LOSS";
}

function toInt(n, fallback = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.trunc(x);
}

function clampInt(n, min, max, fallback) {
  const x = toInt(n, fallback);
  return Math.max(min, Math.min(max, x));
}

// -------------------- POST /stats/duel/complete --------------------
// Body: { scoreEarned: number, outcome: "WIN"|"LOSS", duelKey: string }
router.post("/duel/complete", requireAuth, async (req, res) => {
  try {
    const { scoreEarned, outcome, duelKey } = req.body || {};

    if (!duelKey || typeof duelKey !== "string") {
      return res.status(400).json({ error: "Missing duelKey" });
    }
    if (!isValidOutcome(outcome)) {
      return res.status(400).json({ error: "Invalid outcome" });
    }

    const score = toInt(scoreEarned, 0);

    const created = await prisma.duelResult.create({
      data: {
        userId: req.userId,
        duelKey: duelKey.trim(),
        outcome,
        scoreEarned: score,
      },
      select: { id: true },
    });

    return res.status(200).json({ ok: true, id: created.id });
  } catch (err) {
    // If you have @@unique([userId, duelKey]) this prevents double inserts.
    if (err?.code === "P2002") {
      return res.status(200).json({ ok: true, dup: true });
    }

    console.error("stats/duel/complete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------------------- GET /stats/me --------------------
// Returns aggregated stats (+ recent) for logged-in user
// Query: ?recent=10  (optional, default 10, max 50)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const recentLimit = clampInt(req.query.recent, 0, 50, 10);

    const [totalDuels, wins, losses, scoreAgg, recent] = await Promise.all([
      prisma.duelResult.count({ where: { userId } }),
      prisma.duelResult.count({ where: { userId, outcome: "WIN" } }),
      prisma.duelResult.count({ where: { userId, outcome: "LOSS" } }),
      prisma.duelResult.aggregate({
        where: { userId },
        _sum: { scoreEarned: true },
      }),
      recentLimit > 0
        ? prisma.duelResult.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: recentLimit,
            select: {
              duelKey: true,
              outcome: true,
              scoreEarned: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const totalScore = scoreAgg?._sum?.scoreEarned ?? 0;
    const winRate = totalDuels > 0 ? wins / totalDuels : 0;

    return res.status(200).json({
      ok: true,
      totals: {
        totalDuels,
        wins,
        losses,
        totalScore,
        winRate, // 0..1
      },
      recent,
    });
  } catch (err) {
    console.error("stats/me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------------------- Optional: GET /stats/me/recent --------------------
// Query: ?limit=20
router.get("/me/recent", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = clampInt(req.query.limit, 1, 50, 20);

    const recent = await prisma.duelResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        duelKey: true,
        outcome: true,
        scoreEarned: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ ok: true, recent });
  } catch (err) {
    console.error("stats/me/recent error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { statsRouter: router };
