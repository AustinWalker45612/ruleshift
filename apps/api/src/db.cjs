// src/db.cjs
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
console.log("DATABASE_URL present?", !!url);
if (url) console.log("DATABASE_URL (masked):", url.replace(/:(.*?)@/, ":***@"));

const prisma = new PrismaClient({
  datasourceUrl: url, // ✅ Prisma v7 expects this if schema doesn't contain datasource url
});

module.exports = { prisma };
