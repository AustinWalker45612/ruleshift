// src/routes/auth.routes.cjs
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

// 🔐 single source of truth for cookie name
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "rs_token";

function makeTokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

// ---------------- REGISTER ----------------
router.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim();

    if (!email || !password || !displayName) {
      return res
        .status(400)
        .json({ error: "email, password, and displayName are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    const token = signToken(makeTokenPayload(user));

    // ✅ FIX: pass cookie name explicitly
    setAuthCookie(res, token, AUTH_COOKIE_NAME);

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------------- LOGIN ----------------
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

    const token = signToken(makeTokenPayload(user));

    // ✅ FIX: pass cookie name explicitly
    setAuthCookie(res, token, AUTH_COOKIE_NAME);

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------------- ME ----------------
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
      clearAuthCookie(res, AUTH_COOKIE_NAME);
      return res.status(401).json({ user: null });
    }

    const userId = decoded?.sub;
    if (!userId) {
      clearAuthCookie(res, AUTH_COOKIE_NAME);
      return res.status(401).json({ user: null });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      clearAuthCookie(res, AUTH_COOKIE_NAME);
      return res.status(401).json({ user: null });
    }

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------------- LOGOUT ----------------
router.post("/logout", (_req, res) => {
  clearAuthCookie(res, AUTH_COOKIE_NAME);
  return res.status(200).json({ ok: true });
});

module.exports = { authRouter: router };
