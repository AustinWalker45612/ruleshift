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
    req.auth = decoded;
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
    if (err?.code === "P2002") return res.status(200).json({ ok: true, dup: true });
    console.error("stats/duel/complete error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------------------- GET /stats/me --------------------
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
            select: { duelKey: true, outcome: true, scoreEarned: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const totalScore = scoreAgg?._sum?.scoreEarned ?? 0;
    const winRate = totalDuels > 0 ? wins / totalDuels : 0;

    return res.status(200).json({
      ok: true,
      totals: { totalDuels, wins, losses, totalScore, winRate },
      recent,
    });
  } catch (err) {
    console.error("stats/me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------------------- GET /stats/me/recent --------------------
router.get("/me/recent", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = clampInt(req.query.limit, 1, 50, 20);

    const recent = await prisma.duelResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { duelKey: true, outcome: true, scoreEarned: true, createdAt: true },
    });

    return res.status(200).json({ ok: true, recent });
  } catch (err) {
    console.error("stats/me/recent error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------------------- GET /stats/leaderboard --------------------
// Public leaderboard (no auth): /stats/leaderboard?metric=score|wins|winRate&limit=10&minDuels=3
router.get("/leaderboard", async (req, res) => {
  try {
    const metricRaw = String(req.query.metric || "score");
    const metric =
      metricRaw === "wins" || metricRaw === "winRate" || metricRaw === "score"
        ? metricRaw
        : "score";

    const limit = clampInt(req.query.limit, 1, 50, 10);
    const minDuels = clampInt(req.query.minDuels, 1, 1000, 3);

    // Order column depends on metric
    const orderSql =
      metric === "wins"
        ? `"wins" DESC`
        : metric === "winRate"
        ? `"winRate" DESC`
        : `"totalScore" DESC`;

    // Raw SQL keeps this fast + simple (conditional counts + winRate)
    const sql = `
      WITH agg AS (
        SELECT
          "userId",
          COUNT(*)::int AS "totalDuels",
          SUM(CASE WHEN "outcome" = 'WIN' THEN 1 ELSE 0 END)::int AS "wins",
          SUM(CASE WHEN "outcome" = 'LOSS' THEN 1 ELSE 0 END)::int AS "losses",
          COALESCE(SUM("scoreEarned"), 0)::int AS "totalScore"
        FROM "DuelResult"
        GROUP BY "userId"
      )
      SELECT
        a."userId",
        u."displayName",
        a."totalDuels",
        a."wins",
        a."losses",
        a."totalScore",
        CASE
          WHEN a."totalDuels" > 0 THEN (a."wins"::float / a."totalDuels"::float)
          ELSE 0
        END AS "winRate"
      FROM agg a
      JOIN "User" u ON u."id" = a."userId"
      WHERE a."totalDuels" >= $1
      ORDER BY ${orderSql}, a."totalDuels" DESC, u."displayName" ASC
      LIMIT $2;
    `;

    const results = await prisma.$queryRawUnsafe(sql, minDuels, limit);

    const rows = (results || []).map((r) => {
      const value =
        metric === "wins"
          ? Number(r.wins || 0)
          : metric === "winRate"
          ? Number(r.winRate || 0)
          : Number(r.totalScore || 0);

      return {
        userId: String(r.userId),
        displayName: String(r.displayName || "Player"),
        value,
        totalDuels: Number(r.totalDuels || 0),
      };
    });

    return res.status(200).json({ ok: true, metric, rows });
  } catch (err) {
    console.error("stats/leaderboard error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { statsRouter: router };
