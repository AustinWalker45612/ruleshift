// src/db.cjs
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const url = process.env.DATABASE_URL || "";

const { PrismaClient } = require("@prisma/client");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

console.log("PRISMA duelResult exists?", !!prisma.duelResult);

module.exports = { prisma, pool };
