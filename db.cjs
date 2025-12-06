// db.cjs
require("dotenv").config(); // if you're using a .env file

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

// Reuse a single pg pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tell Prisma to use the pg adapter (Prisma 7 style)
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

module.exports = { prisma };
