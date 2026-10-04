const crypto = require('node:crypto');
const db = require('../db/connection');

/*
 * Turn a hospitals row (+ the user's role in it) into the shape the
 * frontend uses. doctorName falls back to the logged-in doctor's name
 * so prescriptions never print a blank doctor.
 */
function toClinic(row, fallbackDoctorName) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address || '',
    doctorName: row.doctor_name || fallbackDoctorName || '',
    qualification: row.qualification || '',
    regNo: row.reg_no || '',
    bannerImage: row.banner_image || '',
    role: row.role,
  };
}

/*
 * All clinics this user is allowed to open (active membership only).
 */
function listClinicsForUser(userId) {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);

  const rows = db.prepare(`
    SELECT
      hospitals.id, hospitals.name, hospitals.code, hospitals.address,
      hospitals.doctor_name, hospitals.qualification, hospitals.reg_no,
      hospitals.banner_image,
      clinic_users.role AS role
    FROM clinic_users
    JOIN hospitals ON hospitals.id = clinic_users.hospital_id
    WHERE clinic_users.user_id = ?
      AND clinic_users.status = 'active'
      AND hospitals.deleted_at IS NULL
    ORDER BY hospitals.id
  `).all(userId);

  return rows.map((row) => toClinic(row, user?.name));
}

/*
 * The clinic if (and only if) this user has an active membership in it.
 */
function getClinicForUser(userId, hospitalId) {
  return (
    listClinicsForUser(userId).find(
      (clinic) => clinic.id === Number(hospitalId)
    ) || null
  );
}

function generateClinicCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = 'CLN' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const taken = db.prepare('SELECT 1 FROM hospitals WHERE code = ?').get(code);
    if (!taken) return code;
  }
  throw new Error('Could not generate a unique clinic code');
}

/*
 * Create a new clinic and make this user its owner. The clinic starts
 * completely empty - its patients, visits, receipts etc. are separate
 * from every other clinic.
 */
function createClinic(userId, details) {
  const code = generateClinicCode();

  db.exec('BEGIN');
  try {
    const result = db.prepare(`
      INSERT INTO hospitals (name, code, address, doctor_name, qualification, reg_no, banner_image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      details.name,
      code,
      details.address || null,
      details.doctorName || null,
      details.qualification || null,
      details.regNo || null,
      details.bannerImage || null
    );

    const hospitalId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO clinic_users (user_id, hospital_id, role, status)
      VALUES (?, ?, 'owner', 'active')
    `).run(userId, hospitalId);

    db.exec('COMMIT');
    return getClinicForUser(userId, hospitalId);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function updateClinic(hospitalId, details) {
  // bannerImage is only overwritten when a new one is explicitly sent -
  // this lets "edit clinic" (name/address etc.) work without silently
  // wiping out a banner that was already uploaded.
  if (details.bannerImage !== undefined) {
    db.prepare(`
      UPDATE hospitals
      SET name = ?, address = ?, doctor_name = ?, qualification = ?, reg_no = ?, banner_image = ?
      WHERE id = ?
    `).run(
      details.name,
      details.address || null,
      details.doctorName || null,
      details.qualification || null,
      details.regNo || null,
      details.bannerImage || null,
      hospitalId
    );
  } else {
    db.prepare(`
      UPDATE hospitals
      SET name = ?, address = ?, doctor_name = ?, qualification = ?, reg_no = ?
      WHERE id = ?
    `).run(
      details.name,
      details.address || null,
      details.doctorName || null,
      details.qualification || null,
      details.regNo || null,
      hospitalId
    );
  }
}

// Soft-delete: the clinic and its data stay in the database (nothing is
// actually erased) but it stops showing up in listClinicsForUser, and
// its login code stops working.
function archiveClinic(hospitalId) {
  db.prepare(`
    UPDATE hospitals
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(hospitalId);
}

module.exports = {
  listClinicsForUser,
  getClinicForUser,
  createClinic,
  updateClinic,
  archiveClinic,
};
