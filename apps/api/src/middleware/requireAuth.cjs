// src/middleware/requireAuth.cjs
const { getTokenFromReq, verifyToken } = require("../../apps/web/src/utils/auth.cjs");

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const decoded = verifyToken(token);
    req.auth = decoded; // { sub, email, displayName, ... }
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

module.exports = { requireAuth };
