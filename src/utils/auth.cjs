// src/utils/auth.cjs
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🔒 Cookie name (must match frontend expectations)
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "rs_token";

// -------------------- JWT helpers --------------------
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET env var");
  }
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

  /**
   * Cross-site cookies (Vercel frontend + Render backend):
   *   sameSite: "none"
   *   secure: true
   *
   * Local dev:
   *   sameSite: "lax"
   *   secure: false
   */
  const sameSite =
    process.env.AUTH_COOKIE_SAMESITE ||
    (isProd ? "none" : "lax");

  const secure =
    process.env.AUTH_COOKIE_SECURE === "true"
      ? true
      : process.env.AUTH_COOKIE_SECURE === "false"
      ? false
      : isProd;

  // ⚠️ Browsers REQUIRE secure=true if sameSite="none"
  if (sameSite === "none" && !secure) {
    console.warn(
      "[auth] sameSite='none' without secure=true will break cookies"
    );
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
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: IS_PROD,        // true on https
        sameSite: "lax",        // best for same-origin
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 30
      });      
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

function getTokenFromReq(req) {
  // requires cookie-parser middleware
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

// -------------------- Exports --------------------
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
