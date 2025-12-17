// src/routes/stats.routes.cjs
const express = require("express");
const { prisma } = require("../db.cjs");
const { getTokenFromReq, verifyToken } = require("../utils/auth.cjs");

const router = express.Router();

// -------------------- Auth middleware --------------------
function requireAuth(req, res, next) {
  const token = getTokenFromReq(req); // supports Authorization: Bearer + cookie fallback (per your utils/auth.cjs)
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

// -------------------- GET /stats/leaderboard --------------------
// Public leaderboard (no auth)
// Query: ?metric=score|wins|winrate&limit=10&minDuels=3
router.get("/leaderboard", async (req, res) => {
  try {
    const metric = String(req.query.metric || "score");
    const limit = clampInt(req.query.limit, 1, 50, 10);
    const minDuels = clampInt(req.query.minDuels, 0, 999999, 3);

    // Aggregate per user (total duels + total score)
    const grouped = await prisma.duelResult.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _sum: { scoreEarned: true },
    });

    // Wins per user (separate query because groupBy can't conditional-count in one pass)
    const winsGrouped = await prisma.duelResult.groupBy({
      by: ["userId"],
      _count: { _all: true },
      where: { outcome: "WIN" },
    });

    const winsMap = new Map(winsGrouped.map((r) => [r.userId, r._count._all]));

    // Names for users on the board
    const userIds = grouped.map((g) => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true },
    });
    const nameMap = new Map(users.map((u) => [u.id, u.displayName]));

    const rows = grouped
      .map((g) => {
        const totalDuels = g._count._all || 0;
        const wins = winsMap.get(g.userId) || 0;
        const losses = Math.max(0, totalDuels - wins);
        const totalScore = g._sum.scoreEarned || 0;
        const winRate = totalDuels > 0 ? wins / totalDuels : 0;

        return {
          userId: g.userId,
          displayName: nameMap.get(g.userId) || "Player",
          totalDuels,
          wins,
          losses,
          totalScore,
          winRate,
        };
      })
      .filter((r) => r.totalDuels >= minDuels);

    let sorted;
    if (metric === "wins") {
      sorted = rows.sort(
        (a, b) => b.wins - a.wins || b.totalScore - a.totalScore || b.totalDuels - a.totalDuels
      );
    } else if (metric === "winrate") {
      sorted = rows.sort(
        (a, b) => b.winRate - a.winRate || b.totalDuels - a.totalDuels || b.totalScore - a.totalScore
      );
    } else {
      // default score
      sorted = rows.sort(
        (a, b) => b.totalScore - a.totalScore || b.wins - a.wins || b.totalDuels - a.totalDuels
      );
    }

    return res.status(200).json({ ok: true, metric, rows: sorted.slice(0, limit) });
  } catch (err) {
    console.error("stats/leaderboard error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { statsRouter: router };
