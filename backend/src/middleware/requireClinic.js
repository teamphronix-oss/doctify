const db = require('../db/connection');

/*
 * Use AFTER requireAuth, on every route that touches clinic data.
 *
 * - The token must have been issued for a selected clinic.
 * - We re-check in the database, on every request, that this user still
 *   has an active membership in that clinic (so removing a doctor from
 *   a clinic takes effect immediately, not when the token expires).
 *
 * The clinic id used by the routes is ALWAYS req.auth.hospitalId, taken
 * from the verified token - never from the request body or URL.
 */
function requireClinic(req, res, next) {
  const { userId, hospitalId } = req.auth || {};

  if (!hospitalId) {
    return res.status(403).json({
      error: 'Please select a clinic first.',
      code: 'CLINIC_REQUIRED',
    });
  }

  const membership = db.prepare(`
    SELECT clinic_users.role AS role
    FROM clinic_users
    JOIN users ON users.id = clinic_users.user_id
    JOIN hospitals ON hospitals.id = clinic_users.hospital_id
    WHERE clinic_users.user_id = ?
      AND clinic_users.hospital_id = ?
      AND clinic_users.status = 'active'
      AND users.status = 'active'
      AND hospitals.deleted_at IS NULL
  `).get(userId, hospitalId);

  if (!membership) {
    return res.status(403).json({
      error: 'You do not have access to this clinic.',
      code: 'CLINIC_FORBIDDEN',
    });
  }

  req.auth.role = membership.role;
  next();
}

module.exports = requireClinic;
