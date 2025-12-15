// src/db.cjs
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { URL } = require("url");

const DATABASE_URL = process.env.DATABASE_URL || "";
const IS_PROD = process.env.NODE_ENV === "production";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing at runtime.");
  // Crash early so Render clearly shows the config issue
  throw new Error("DATABASE_URL is required");
}

// Helpful runtime logging (no credentials)
try {
  const u = new URL(DATABASE_URL);
  console.log("DB host (runtime):", u.host);
  console.log("DB name (runtime):", u.pathname);
  console.log("DB sslmode param:", u.searchParams.get("sslmode"));
} catch {
  console.log("DB host (runtime): (unable to parse DATABASE_URL)");
}

// ✅ IMPORTANT: Force SSL in production (Render Postgres expects SSL)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(IS_PROD
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
});

// Prisma using the pg pool adapter
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Optional but strongly recommended: verify connectivity once at boot
(async () => {
  try {
    await pool.query("SELECT 1;");
    console.log("✅ pg Pool can query DB");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma can query DB");
    console.log("PRISMA duelResult exists?", !!prisma.duelResult);
  } catch (err) {
    console.error("❌ DB connectivity check failed:", err);
  }
})();

module.exports = { prisma, pool };
