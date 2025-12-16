// apps/api/src/db.cjs
require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

module.exports = { prisma, pool };
