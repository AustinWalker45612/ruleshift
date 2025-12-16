// apps/api/src/db.cjs
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
console.log("DATABASE_URL present?", !!url);

// mask user/pass but keep host visible
try {
  const u = new URL(url);
  console.log("DB host (runtime):", u.host);
  console.log("DB name (runtime):", u.pathname);
  console.log("DB sslmode param:", u.searchParams.get("sslmode"));
} catch {
  console.log("DATABASE_URL (masked):", url.replace(/:(.*?)@/, ":***@"));
}

const prisma = new PrismaClient();

module.exports = { prisma };
