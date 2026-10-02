// Creates one demo doctor account linked to the demo clinic, so you can
// test real backend login instead of the old hardcoded frontend values.
//
// Run with: npm run seed:auth
//
// Demo login after running this:
//   Hospital Code: DEMO001
//   User Code:     DR001
//   PIN:           1234
require('dotenv').config();
const db = require('./connection');
const { hashPassword } = require('../services/authService');

async function run() {
  const hospital = db.prepare(`
    SELECT id, name, code FROM hospitals WHERE code = 'DEMO001'
  `).get();

  if (!hospital) {
    console.error('Demo hospital (DEMO001) not found. Start the backend once first so connection.js can create it.');
    process.exit(1);
  }

  const userCode = 'DR001';
  const pin = '1234';

  let user = db.prepare(`
    SELECT id FROM users WHERE user_code = ?
  `).get(userCode);

  if (!user) {
    const passwordHash = await hashPassword(pin);

    const result = db.prepare(`
      INSERT INTO users (user_code, name, password_hash, status)
      VALUES (?, ?, ?, 'active')
    `).run(userCode, 'Demo Doctor', passwordHash);

    user = { id: result.lastInsertRowid };
    console.log(`Created user ${userCode} (id ${user.id}).`);
  } else {
    console.log(`User ${userCode} already exists (id ${user.id}). Leaving password as-is.`);
  }

  const link = db.prepare(`
    SELECT id FROM clinic_users WHERE user_id = ? AND hospital_id = ?
  `).get(user.id, hospital.id);

  if (!link) {
    db.prepare(`
      INSERT INTO clinic_users (user_id, hospital_id, role, status)
      VALUES (?, ?, 'doctor', 'active')
    `).run(user.id, hospital.id);

    console.log(`Linked ${userCode} to ${hospital.name} (${hospital.code}).`);
  } else {
    console.log(`${userCode} is already linked to ${hospital.name}.`);
  }

  console.log('\nDemo login:');
  console.log(`  Hospital Code: ${hospital.code}`);
  console.log(`  User Code:     ${userCode}`);
  console.log(`  PIN:           ${pin}`);
}

run().catch((error) => {
  console.error('Seeding demo auth account failed:', error);
  process.exit(1);
});
