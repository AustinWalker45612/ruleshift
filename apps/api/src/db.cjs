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
//adding pool
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

module.exports = { prisma, pool };
