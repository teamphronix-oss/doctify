const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const TOKEN_LIFETIME = '12h';

/*
 * Secret used to sign login tokens. Set JWT_SECRET in backend/.env.
 *
 * If it is missing we fall back to a random secret so the app still
 * runs, but every token becomes invalid whenever the backend restarts
 * (everyone gets logged out). Set a fixed JWT_SECRET to avoid that.
 */
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn(
    '[AUTH] JWT_SECRET is not set in .env - using a temporary random secret. ' +
      'Logins will be reset every time the backend restarts.'
  );
}

/*
 * Hash a plain-text password/PIN before storing it.
 * Never store plain-text credentials in the database.
 */
async function hashPassword(plainText) {
  return bcrypt.hash(String(plainText), SALT_ROUNDS);
}

/*
 * Compare a plain-text password/PIN against a stored hash.
 */
async function verifyPassword(plainText, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(plainText), hash);
}

/*
 * Create a signed login token. Only ids and role go inside - never
 * the PIN or anything secret.
 */
function signToken({ userId, hospitalId, role }) {
  return jwt.sign({ userId, hospitalId, role }, JWT_SECRET, {
    expiresIn: TOKEN_LIFETIME,
  });
}

/*
 * Returns the token's payload, or null if it is invalid/expired/tampered.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
};
