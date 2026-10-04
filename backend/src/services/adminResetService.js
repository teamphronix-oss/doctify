// Shared logic for resetting a doctor's PIN - used by BOTH:
//   - the resetPin.js CLI tool (you, running it on your own computer)
//   - the POST /admin/reset-pin route (the in-app "Admin" page, run on
//     the doctor's own computer when you talk them through it on a call)
// Keeping it in one place means both ways of resetting a PIN always
// behave identically.
const db = require('./../db/connection');
const { hashPassword } = require('./authService');

async function resetUserPin(userCode, newPin) {
  const user = db.prepare('SELECT id, name FROM users WHERE user_code = ?').get(userCode);

  if (!user) {
    const error = new Error(`No doctor found with user code "${userCode}".`);
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const passwordHash = await hashPassword(newPin);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  return { id: user.id, name: user.name };
}

module.exports = { resetUserPin };
