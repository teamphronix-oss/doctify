const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');

const { resetUserPin } = require('../services/adminResetService');

/*
 * ADMIN_CODE is the "key" for the in-app Admin Reset page: a secret
 * only YOU know, set once in backend/.env. A doctor who forgot their
 * PIN calls you, you read this code (and a new PIN) out to them over
 * the phone, they type both into the Admin page on their own computer.
 *
 * This route needs NO login token (a locked-out doctor has none) - the
 * admin code is the only thing protecting it.
 */
let ADMIN_CODE = process.env.ADMIN_CODE;

if (!ADMIN_CODE) {
  console.warn(
    '[ADMIN] ADMIN_CODE is not set in .env - the Admin Reset page will refuse every request until you set one.'
  );
}

// Constant-time comparison so a wrong guess can't be narrowed down by
// how long the check takes to fail.
function isAdminCodeValid(candidate) {
  if (!ADMIN_CODE || !candidate) return false;
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(ADMIN_CODE);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.post('/reset-pin', async (req, res) => {
  const { adminCode, userCode, newPin } = req.body || {};

  if (!ADMIN_CODE) {
    return res.status(503).json({
      error: 'Admin reset is not set up on this computer yet.',
    });
  }

  if (!adminCode || !userCode || !newPin) {
    return res.status(400).json({
      error: 'Admin code, user code and new PIN are all required.',
    });
  }

  if (!isAdminCodeValid(adminCode)) {
    return res.status(401).json({ error: 'Incorrect admin code.' });
  }

  try {
    const user = await resetUserPin(String(userCode).trim(), String(newPin));
    res.json({ message: `PIN reset for ${user.name || userCode}.` });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    console.error('[ADMIN] Reset PIN failed:', error);
    res.status(500).json({ error: 'Could not reset PIN. Please try again.' });
  }
});

module.exports = router;
