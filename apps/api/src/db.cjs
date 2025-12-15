// src/db.cjs
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
console.log("DATABASE_URL present?", !!url);
console.log("DATABASE_URL (masked):", url.replace(/:(.*?)@/, ":***@"));

const prisma = new PrismaClient();

module.exports = { prisma };
