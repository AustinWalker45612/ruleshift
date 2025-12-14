// src/db.cjs
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("./generated/client.js");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

console.log("PRISMA duelResult exists?", !!prisma.duelResult);

module.exports = { prisma, pool };
