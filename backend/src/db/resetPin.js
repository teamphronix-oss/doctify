// Admin tool: resets one doctor's PIN. Run this yourself (the software's
// admin) when a doctor forgets their PIN and contacts you.
//
// This is the command-line version, for YOUR OWN computer. The
// POST /admin/reset-pin route (routes/admin.js) is the in-app version
// of the same thing, for a doctor's own computer when they're the one
// locked out - both use the same resetUserPin() logic underneath.
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
const { resetUserPin } = require('../services/adminResetService');

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

  try {
    const user = await resetUserPin(userCode, newPin);
    console.log(`PIN reset for ${userCode} (${user.name || 'no name on file'}).`);
    console.log(`New PIN: ${newPin}`);
    console.log('Tell the doctor to log in with this PIN and keep it safe.');
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      console.error(`${error.message} Run with --list to see all accounts.`);
      process.exit(1);
    }
    throw error;
  }
}

run().catch((error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});
