// apps/api/src/db.cjs
require("dotenv").config();

const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing at runtime");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma client (adapter-pg)
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

/**
 * Matchmaking cleanup
 * - Marks old WAITING rooms as ABANDONED so they won't be matched later.
 * - Runs on an interval.
 *
 * Tunables (env optional):
 *   MATCHMAKING_WAITING_TTL_MINUTES (default: 15)
 *   MATCHMAKING_CLEANUP_INTERVAL_MINUTES (default: 5)
 */
const WAITING_TTL_MINUTES = Number(process.env.MATCHMAKING_WAITING_TTL_MINUTES || 15);
const CLEANUP_INTERVAL_MINUTES = Number(
  process.env.MATCHMAKING_CLEANUP_INTERVAL_MINUTES || 5
);

const WAITING_TTL_MS = Math.max(1, WAITING_TTL_MINUTES) * 60 * 1000;
const CLEANUP_INTERVAL_MS = Math.max(1, CLEANUP_INTERVAL_MINUTES) * 60 * 1000;

let matchmakingCleanupTimer = null;

async function cleanupMatchmakingRooms() {
  try {
    const cutoff = new Date(Date.now() - WAITING_TTL_MS);

    // Abandon any stale WAITING rooms
    const res = await prisma.matchmakingRoom.updateMany({
      where: {
        status: "WAITING",
        createdAt: { lt: cutoff },
      },
      data: {
        status: "ABANDONED",
        abandonedAt: new Date(),
      },
    });

    if (res?.count) {
      console.log(
        `🧹 Matchmaking cleanup: abandoned ${res.count} stale WAITING room(s) (older than ${WAITING_TTL_MINUTES}m)`
      );
    }
  } catch (err) {
    // Don't crash the server for cleanup issues
    console.error("❌ Matchmaking cleanup error:", err);
  }
}

// Start cleanup after Prisma is ready
function startMatchmakingCleanup() {
  if (matchmakingCleanupTimer) return;
  matchmakingCleanupTimer = setInterval(cleanupMatchmakingRooms, CLEANUP_INTERVAL_MS);
  // run once shortly after boot
  setTimeout(cleanupMatchmakingRooms, 5 * 1000);
}

// Stop cleanup on shutdown
function stopMatchmakingCleanup() {
  if (matchmakingCleanupTimer) {
    clearInterval(matchmakingCleanupTimer);
    matchmakingCleanupTimer = null;
  }
}

// Start immediately on import (this module is loaded once at server boot)
startMatchmakingCleanup();

module.exports = { prisma, pool, startMatchmakingCleanup, stopMatchmakingCleanup };
