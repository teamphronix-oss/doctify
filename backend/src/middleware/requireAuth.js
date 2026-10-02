const { verifyToken } = require('../services/authService');

/*
 * Blocks any request that does not carry a valid login token.
 *
 * The frontend sends:  Authorization: Bearer <token>
 * On success, req.auth = { userId, hospitalId, role } is available to
 * the route handlers that run after this.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Login required.' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      error: 'Session expired or invalid. Please log in again.',
    });
  }

  req.auth = {
    userId: payload.userId,
    hospitalId: payload.hospitalId,
    role: payload.role,
  };

  next();
}

module.exports = requireAuth;
