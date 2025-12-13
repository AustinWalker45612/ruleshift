// src/routes/auth.routes.js
const express = require("express");
const { prisma } = require("../db.cjs");

const {
  hashPassword,
  verifyPassword,
  signToken,
  sanitizeUser,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromReq,
  verifyToken,
} = require("../utils/auth.cjs");

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /auth/register
 * body: { email, password, displayName }
 */
router.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim();

    if (!email || !password || !displayName) {
      return res.status(400).json({
        error: "email, password, and displayName are required",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
    });

    const token = signToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ sub: user.id, email: user.email });
    setAuthCookie(res, token);

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /auth/me
 * returns the current user if logged in
 */
router.get("/me", async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ user: null });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ user: null });
    }

    const userId = decoded?.sub;
    if (!userId) return res.status(401).json({ user: null });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ user: null });
    }

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /auth/logout
 * clears cookie
 */
router.post("/logout", async (_req, res) => {
  try {
    clearAuthCookie(res);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = { authRouter: router };
