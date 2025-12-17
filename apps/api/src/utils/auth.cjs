// src/utils/auth.cjs
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// -------------------- Constants --------------------
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "rs_token";

// -------------------- JWT helpers --------------------
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET env var");
  return secret;
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

// -------------------- Cookie helpers --------------------
function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  const sameSite = process.env.AUTH_COOKIE_SAMESITE ?? (isProd ? "none" : "lax");

  const secure =
    process.env.AUTH_COOKIE_SECURE !== undefined
      ? process.env.AUTH_COOKIE_SECURE === "true"
      : isProd;

  if (sameSite === "none" && !secure) {
    console.warn("[auth] sameSite='none' requires secure=true or cookies WILL be blocked");
  }

  return {
    httpOnly: true,
    secure,
    sameSite, // "lax" | "strict" | "none"
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  };
}

function setAuthCookie(res, token) {
  // Cookie is optional now (some browsers block it). Keep it anyway for desktops.
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

function getTokenFromReq(req) {
  // 1) Prefer Authorization: Bearer <token>  (works on iPhone Chrome)
  const auth = req?.headers?.authorization || req?.headers?.Authorization;
  if (typeof auth === "string") {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return m[1].trim();
  }

  // 2) Fallback to cookie (works on same-site / many desktop setups)
  return req?.cookies?.[COOKIE_NAME] || null;
}

// -------------------- Password helpers --------------------
async function hashPassword(plain) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  return bcrypt.hash(plain, saltRounds);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// -------------------- User helpers --------------------
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
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
