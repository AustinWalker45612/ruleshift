// src/middleware/requireAuth.js
const { getTokenFromReq, verifyToken } = require("../utils/auth");

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = verifyToken(token); // { sub, email, ... }
    // Put the JWT claims on the request
    req.auth = decoded;

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

module.exports = { requireAuth };
