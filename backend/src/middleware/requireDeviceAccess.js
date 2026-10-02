const db = require('../db/connection');

/*
 * For settings that affect the WHOLE installation, not one clinic:
 * cloud sync / data mode, and full backups (a full backup contains the
 * raw database file, i.e. every clinic on this device).
 *
 * Allowed only when the logged-in user belongs to EVERY clinic in this
 * database. For a single doctor with several clinics that is always
 * true, so nothing changes for them. It blocks a doctor from pulling
 * another doctor's clinics out of a shared installation.
 */
function requireDeviceAccess(req, res, next) {
  const outside = db.prepare(`
    SELECT COUNT(*) AS count
    FROM hospitals
    WHERE deleted_at IS NULL
      AND id NOT IN (
        SELECT hospital_id
        FROM clinic_users
        WHERE user_id = ? AND status = 'active'
      )
  `).get(req.auth.userId);

  if (outside.count > 0) {
    return res.status(403).json({
      error:
        'This action covers every clinic on this device, and your account does not belong to all of them.',
      code: 'DEVICE_ACCESS_REQUIRED',
    });
  }

  next();
}

module.exports = requireDeviceAccess;
