const { getTokenFromReq, verifyToken } = require("../utils/auth.cjs");

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = verifyToken(token);
    const userId = decoded?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Invalid session" });
    }

    req.userId = userId;
    req.auth = decoded;

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

module.exports = { requireAuth };
