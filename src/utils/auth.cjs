// src/utils/auth.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ruleshift_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET env var");
  }
  return secret;
}

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  // If your frontend/backend are on different domains (cross-site cookies),
  // you will likely need: sameSite: "none" + secure: true (HTTPS only).
  const sameSite =
    process.env.AUTH_COOKIE_SAMESITE ||
    (isProd ? "none" : "lax"); // "none" for cross-site, "lax" for local

  const secure =
    process.env.AUTH_COOKIE_SECURE === "true"
      ? true
      : process.env.AUTH_COOKIE_SECURE === "false"
      ? false
      : isProd; // default secure in prod

  return {
    httpOnly: true,
    secure,
    sameSite, // "lax" | "strict" | "none"
    path: "/",
    // domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  };
}

async function hashPassword(plain) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  return bcrypt.hash(plain, saltRounds);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(payload) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "30d";
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

function clearAuthCookie(res) {
  // Must match path/domain/samesite/secure well enough to clear in browsers
  const opts = getCookieOptions();
  res.clearCookie(COOKIE_NAME, {
    ...opts,
    maxAge: 0,
  });
}

function getTokenFromReq(req) {
  // requires cookie-parser middleware
  return req?.cookies?.[COOKIE_NAME] || null;
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  sanitizeUser,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromReq,
};
