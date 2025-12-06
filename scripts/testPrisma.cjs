// scripts/testPrisma.cjs
require("dotenv/config");

const { PrismaClient } = require("../src/generated"); // 👈 NOTE: no .cjs
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Render uses SSL
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  console.log("Testing Prisma connection…");

  const allPlayers = await prisma.player.findMany();
  console.log("Players in DB:", allPlayers);
}

main()
  .catch((err) => {
    console.error("Error in testPrisma:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
