const express = require('express');
const router = express.Router();

const db = require('../db/connection');
const requireAuth = require('../middleware/requireAuth');
const { verifyPassword, signToken } = require('../services/authService');
const {
  listClinicsForUser,
  getClinicForUser,
} = require('../services/clinicService');

/*
 * POST /auth/login   { hospitalCode, userCode, pin }
 *
 * Opens one specific clinic directly (this is the Sign In screen: the
 * user types the clinic's hospital code along with their own user code
 * + PIN). The same user code + PIN work across every clinic this doctor
 * belongs to - only the hospital code differs per clinic.
 *
 * The response also includes the doctor's full clinic list, so the app
 * can offer "Switch Clinic" later without asking them to log in again.
 */
router.post('/login', async (req, res) => {
  const { hospitalCode, userCode, pin } = req.body || {};

  if (!hospitalCode || !userCode || !pin) {
    return res.status(400).json({
      error: 'Hospital code, user code and PIN are all required.',
    });
  }

  // Same generic error for every failure below, on purpose - it does not
  // tell an attacker WHICH field was wrong.
  const invalidCredentials = () =>
    res.status(401).json({ error: 'Invalid hospital code, user code or PIN.' });

  const hospital = db.prepare(`
    SELECT id, name, code
    FROM hospitals
    WHERE code = ? AND deleted_at IS NULL
  `).get(String(hospitalCode).trim());

  if (!hospital) {
    return invalidCredentials();
  }

  const account = db.prepare(`
    SELECT
      users.id AS user_id,
      users.name AS user_name,
      users.password_hash AS password_hash,
      users.status AS user_status,
      clinic_users.role AS role,
      clinic_users.status AS clinic_user_status
    FROM clinic_users
    JOIN users ON users.id = clinic_users.user_id
    WHERE clinic_users.hospital_id = ?
      AND users.user_code = ?
  `).get(hospital.id, String(userCode).trim());

  if (!account) {
    return invalidCredentials();
  }

  const isPinValid = await verifyPassword(pin, account.password_hash);

  if (!isPinValid) {
    return invalidCredentials();
  }

  if (account.user_status !== 'active' || account.clinic_user_status !== 'active') {
    return res.status(403).json({
      error: 'This account is not active. Contact your admin.',
    });
  }

  const token = signToken({
    userId: account.user_id,
    hospitalId: hospital.id,
    role: account.role,
  });

  res.json({
    token,
    user: { id: account.user_id, name: account.user_name, role: account.role },
    hospital: { id: hospital.id, name: hospital.name, code: hospital.code },
    clinics: listClinicsForUser(account.user_id),
  });
});

/*
 * POST /auth/select-clinic   { hospitalId }      (needs a valid token)
 *
 * Switches the active clinic WITHOUT logging out: only works if the
 * logged-in user actually belongs to that clinic. Used by the in-app
 * "Switch Clinic" screen (not the initial Sign In screen).
 */
router.post('/select-clinic', requireAuth, (req, res) => {
  const clinic = getClinicForUser(req.auth.userId, req.body?.hospitalId);

  if (!clinic) {
    return res.status(403).json({
      error: 'You do not have access to this clinic.',
    });
  }

  const token = signToken({
    userId: req.auth.userId,
    hospitalId: clinic.id,
    role: clinic.role,
  });

  res.json({ token, clinic });
});

module.exports = router;
