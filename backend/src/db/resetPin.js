// Admin tool: resets one doctor's PIN. Run this yourself (the software's
// admin) when a doctor forgets their PIN and contacts you - there is no
// self-service / email-OTP reset by design (see Login screen: "Forgot
// PIN? Contact admin").
//
// Usage:
//   node --experimental-sqlite src/db/resetPin.js <userCode> <newPin>
//
// Example:
//   node --experimental-sqlite src/db/resetPin.js DR001 5678
//
// To just look up who exists first:
//   node --experimental-sqlite src/db/resetPin.js --list
require('dotenv').config();
const db = require('./connection');
const { hashPassword } = require('../services/authService');

async function run() {
  const [, , arg1, arg2] = process.argv;

  if (arg1 === '--list' || !arg1) {
    const rows = db.prepare(`
      SELECT
        users.user_code, users.name, users.status,
        GROUP_CONCAT(hospitals.name, ', ') AS clinics
      FROM users
      LEFT JOIN clinic_users ON clinic_users.user_id = users.id AND clinic_users.status = 'active'
      LEFT JOIN hospitals ON hospitals.id = clinic_users.hospital_id
      GROUP BY users.id
      ORDER BY users.user_code
    `).all();

    console.log('\nExisting doctor accounts:\n');
    console.table(rows);
    console.log('Run: node --experimental-sqlite src/db/resetPin.js <userCode> <newPin>');
    return;
  }

  const userCode = arg1;
  const newPin = arg2;

  if (!newPin) {
    console.error('Usage: node --experimental-sqlite src/db/resetPin.js <userCode> <newPin>');
    process.exit(1);
  }

  const user = db.prepare('SELECT id, name FROM users WHERE user_code = ?').get(userCode);

  if (!user) {
    console.error(`No doctor found with user code "${userCode}". Run with --list to see all accounts.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(newPin);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

  console.log(`PIN reset for ${userCode} (${user.name || 'no name on file'}).`);
  console.log(`New PIN: ${newPin}`);
  console.log('Tell the doctor to log in with this PIN and keep it safe.');
}

run().catch((error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});
