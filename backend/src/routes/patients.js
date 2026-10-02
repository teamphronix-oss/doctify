const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { backupExists } = require('../services/backup');

// ============================================================
// PATIENTS
// ============================================================

// POST /patients - Add Patient
router.post('/', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const { name, gender, age, phone, family_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  // If a family was supplied, make sure it exists.
  if (family_id) {
    const family = db.prepare(
      'SELECT id FROM families WHERE id = ? AND hospital_id = ?'
    ).get(family_id, HOSPITAL_ID);

    if (!family) {
      return res.status(400).json({ error: 'Family not found' });
    }
  }

  const stmt = db.prepare(`
    INSERT INTO patients
      (hospital_id, name, gender, age, phone, family_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    HOSPITAL_ID,
    name.trim(),
    gender || null,
    age || null,
    phone || null,
    family_id || null
  );

  const patient = db.prepare(
    'SELECT * FROM patients WHERE id = ?'
  ).get(result.lastInsertRowid);

  res.status(201).json(patient);
});


// GET /patients?q=search - Patient Search
router.get('/', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const { q } = req.query;

  const baseQuery = `
    SELECT
      p.*,
      lv.visit_date AS last_visit_date,
      lv.diagnosis AS last_visit_diagnosis
    FROM patients p
    LEFT JOIN (
      SELECT v1.*
      FROM visits v1
    WHERE v1.deleted_at IS NULL
  AND v1.id = (
    SELECT v2.id
    FROM visits v2
    WHERE v2.patient_id = v1.patient_id
      AND v2.deleted_at IS NULL
    ORDER BY v2.visit_date DESC, v2.id DESC
    LIMIT 1
  )
    ) lv ON lv.patient_id = p.id
  `;

  let rows;

  if (q) {
    rows = db.prepare(`
      ${baseQuery}
      WHERE p.deleted_at IS NULL
  AND p.hospital_id = ?
  AND (
    p.name LIKE ?
    OR p.phone LIKE ?
  )
      ORDER BY p.created_at DESC
    `).all(HOSPITAL_ID, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`
      ${baseQuery}
WHERE p.deleted_at IS NULL
  AND p.hospital_id = ?
ORDER BY p.created_at DESC
    `).all(HOSPITAL_ID);
  }

  res.json(rows);
});


// ============================================================
// OLD PHONE-BASED FAMILY MATCH
// ============================================================

// GET /patients/family-matches?phone=...
// Kept for compatibility with the existing AddPatient code.
// This is ONLY a suggestion now — it does NOT define a family.
router.get('/family-matches', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const phone = String(req.query.phone || '').trim();

  if (!phone) {
    return res.json([]);
  }

  const rows = db.prepare(`
    SELECT *
    FROM patients
    WHERE phone = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
ORDER BY name
  `).all(phone, HOSPITAL_ID);

  res.json(rows);
});


// ============================================================
// FAMILY MANAGEMENT
// ============================================================

// GET /patients/families?q=...
// Search families by family name, member name, or member phone.
// Always returns members[] because the frontend displays family members.
router.get('/families', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const q = String(req.query.q || '').trim();
  const like = `%${q}%`;

  const families = db.prepare(`
    SELECT
      f.id,
      f.label,
      f.hospital_id,
      COUNT(DISTINCT p.id) AS member_count
    FROM families f
    LEFT JOIN patients p
     ON p.family_id = f.id
AND p.hospital_id = ?
AND p.deleted_at IS NULL
    WHERE f.hospital_id = ?
      AND (
        ? = ''
        OR f.label LIKE ?
        OR EXISTS (
          SELECT 1
          FROM patients sp
          WHERE sp.family_id = f.id
           AND sp.hospital_id = ?
AND sp.deleted_at IS NULL
AND (
              sp.name LIKE ?
              OR sp.phone LIKE ?
            )
        )
      )
    GROUP BY f.id, f.label, f.hospital_id
    ORDER BY f.id DESC
  `).all(
    HOSPITAL_ID,
    HOSPITAL_ID,
    q,
    like,
    HOSPITAL_ID,
    like,
    like
  );

  const result = families.map(family => {
    const members = db.prepare(`
      SELECT
        id,
        name,
        age,
        gender,
        phone
      FROM patients
    WHERE family_id = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
    `).all(family.id, HOSPITAL_ID);

    return {
      id: String(family.id),
      label: family.label || `Family ${family.id}`,
      memberCount: Number(family.member_count),
      members: members.map(member => ({
        id: String(member.id),
        name: member.name,
        age: member.age ?? 0,
        gender: member.gender || '',
        phone: member.phone || '',
      })),
    };
  });

  res.json(result);
});
router.post('/families', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const label = String(req.body.label || '').trim();

  if (!label) {
    return res.status(400).json({
      error: 'Family name is required'
    });
  }

  const result = db.prepare(`
    INSERT INTO families (hospital_id, label)
    VALUES (?, ?)
  `).run(HOSPITAL_ID, label);

  const family = db.prepare(`
    SELECT *
    FROM families
    WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(family);
});


// GET /patients/families/:id
//
// Get one family and all its members.
router.get('/families/:id', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const family = db.prepare(`
    SELECT *
    FROM families
    WHERE id = ?
      AND hospital_id = ?
  `).get(req.params.id, HOSPITAL_ID);

  if (!family) {
    return res.status(404).json({
      error: 'Family not found'
    });
  }

  const members = db.prepare(`
    SELECT
      id,
      name,
      age,
      gender,
      phone,
      family_id,
      created_at
    FROM patients
  WHERE family_id = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
ORDER BY name 
  `).all(req.params.id, HOSPITAL_ID);

  res.json({
    ...family,
    member_count: members.length,
    members
  });
});


// POST /patients/families/:id/members
//
// Add an existing patient to a family.
router.post('/families/:id/members', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const patientId = Number(req.body.patientId);

  if (!patientId) {
    return res.status(400).json({
      error: 'patientId is required'
    });
  }

  const family = db.prepare(`
    SELECT id
    FROM families
    WHERE id = ?
      AND hospital_id = ?
  `).get(req.params.id, HOSPITAL_ID);

  if (!family) {
    return res.status(404).json({
      error: 'Family not found'
    });
  }

  const patient = db.prepare(`
    SELECT id, family_id
    FROM patients
    WHERE id = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
  `).get(patientId, HOSPITAL_ID);

  if (!patient) {
    return res.status(404).json({
      error: 'Patient not found'
    });
  }

  // If already in another family, don't silently move them.
  if (
    patient.family_id &&
    Number(patient.family_id) !== Number(req.params.id)
  ) {
    return res.status(409).json({
      error: 'Patient already belongs to another family',
      familyId: patient.family_id
    });
  }

  db.prepare(`
    UPDATE patients
    SET family_id = ?
    WHERE id = ?
      AND hospital_id = ?
  `).run(
    req.params.id,
    patientId,
    HOSPITAL_ID
  );

  res.json({
    success: true,
    familyId: Number(req.params.id),
    patientId
  });
});


// DELETE /patients/families/:id/members/:patientId
//
// Remove a patient from a family.
// This does NOT delete the patient.
router.delete('/families/:id/members/:patientId', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const result = db.prepare(`
    UPDATE patients
    SET family_id = NULL
  WHERE id = ?
  AND family_id = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
  `).run(
    req.params.patientId,
    req.params.id,
    HOSPITAL_ID
  );

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Patient is not a member of this family'
    });
  }

  res.status(204).send();
});


// PATCH /patients/families/:id
//
// Rename a family.
router.patch('/families/:id', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const label = String(req.body.label || '').trim();

  if (!label) {
    return res.status(400).json({
      error: 'Family name is required'
    });
  }

  const result = db.prepare(`
    UPDATE families
    SET label = ?
    WHERE id = ?
      AND hospital_id = ?
  `).run(
    label,
    req.params.id,
    HOSPITAL_ID
  );

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Family not found'
    });
  }

  const family = db.prepare(`
    SELECT *
    FROM families
    WHERE id = ?
  `).get(req.params.id);

  res.json(family);
});


// ============================================================
// OLD LINK-FAMILY ENDPOINT
// ============================================================
//
// Kept so existing frontend functionality doesn't break.
//
// This endpoint is still useful for linking multiple existing
// patients together, but the new UI will use the explicit
// family-management endpoints above.
router.post('/link-family', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const { patientIds } = req.body;

  if (!Array.isArray(patientIds) || patientIds.length === 0) {
    return res.status(400).json({
      error: 'patientIds array is required'
    });
  }

  const ids = patientIds
    .map(Number)
    .filter(id => Number.isInteger(id) && id > 0);

  if (ids.length === 0) {
    return res.status(400).json({
      error: 'No valid patient IDs supplied'
    });
  }

  const placeholders = ids.map(() => '?').join(',');

  const existing = db.prepare(`
    SELECT family_id
    FROM patients
   WHERE id IN (${placeholders})
  AND hospital_id = ?
  AND deleted_at IS NULL
  AND family_id IS NOT NULL
    LIMIT 1
  `).get(...ids, HOSPITAL_ID);

  let familyId = existing ? existing.family_id : null;

  if (!familyId) {
    const result = db.prepare(`
      INSERT INTO families (hospital_id, label)
      VALUES (?, NULL)
    `).run(HOSPITAL_ID);

    familyId = result.lastInsertRowid;
  }

  db.prepare(`
    UPDATE patients
    SET family_id = ?
   WHERE id IN (${placeholders})
  AND hospital_id = ?
  AND deleted_at IS NULL
  `).run(familyId, ...ids, HOSPITAL_ID);

  res.json({
    familyId
  });
});


// ============================================================
// PATIENT DETAILS
// ============================================================

// GET /patients/:id - Patient Details
router.get('/:id', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const patient = db.prepare(`
    SELECT *
    FROM patients
    WHERE id = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
  `).get(req.params.id, HOSPITAL_ID);

  if (!patient) {
    return res.status(404).json({
      error: 'Patient not found'
    });
  }

  let family = null;
  let familyMembers = [];

  if (patient.family_id) {
    family = db.prepare(`
      SELECT *
      FROM families
      WHERE id = ?
        AND hospital_id = ?
    `).get(patient.family_id, HOSPITAL_ID);

    if (family) {
      familyMembers = db.prepare(`
        SELECT
          id,
          name,
          age,
          gender,
          phone,
          family_id
        FROM patients
       WHERE family_id = ?
  AND hospital_id = ?
  AND deleted_at IS NULL
  AND id != ?
        ORDER BY name
      `).all(
        patient.family_id,
        HOSPITAL_ID,
        patient.id
      );
    }
  }

  res.json({
    ...patient,
    family,
    familyMembers
  });
});


router.delete('/all', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const { backupFileName } = req.body || {};

  if (!backupFileName) {
    return res.status(400).json({
      error: 'A backup must be created before deleting all patient data',
    });
  }

  if (!backupExists(backupFileName)) {
    return res.status(400).json({
      error: 'The required backup could not be found. Create a new backup first.',
    });
  }

  const now = new Date().toISOString();

  try {
    db.exec('BEGIN');

    const patients = db
      .prepare(`
        SELECT id
        FROM patients
        WHERE hospital_id = ?
          AND deleted_at IS NULL
      `)
      .all(HOSPITAL_ID);

    const patientCount = patients.length;

    if (patientCount === 0) {
      db.exec('COMMIT');

      return res.json({
        deletedPatients: 0,
        message: 'There are no active patient records to delete.',
      });
    }

    /*
     * Soft-delete medicines first.
     *
     * This preserves sync tombstones.
     */
    db.prepare(`
      UPDATE medicines
      SET
        deleted_at = ?,
        updated_at = ?
      WHERE hospital_id = ?
        AND deleted_at IS NULL
        AND visit_id IN (
          SELECT id
          FROM visits
          WHERE hospital_id = ?
            AND deleted_at IS NULL
        )
    `).run(
      now,
      now,
      HOSPITAL_ID,
      HOSPITAL_ID
    );

    /*
     * Soft-delete visits.
     */
    db.prepare(`
      UPDATE visits
      SET
        deleted_at = ?,
        updated_at = ?
      WHERE hospital_id = ?
        AND deleted_at IS NULL
    `).run(
      now,
      now,
      HOSPITAL_ID
    );

    /*
     * Soft-delete patients.
     */
    db.prepare(`
      UPDATE patients
      SET
        deleted_at = ?,
        updated_at = ?
      WHERE hospital_id = ?
        AND deleted_at IS NULL
    `).run(
      now,
      now,
      HOSPITAL_ID
    );

    db.exec('COMMIT');

    res.json({
      deletedPatients: patientCount,
      message: `Successfully deleted ${patientCount} patient record${
        patientCount === 1 ? '' : 's'
      }.`,
      backupFileName,
    });
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors.
    }

    console.error('[PATIENTS] Delete all failed:', error);

    res.status(500).json({
      error: 'Failed to delete all patient data',
    });
  }
});

// ============================================================
// DELETE PATIENT
// ============================================================

// DELETE /patients/:id - Soft delete Patient + Visits + Medicines
router.delete('/:id', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const patientId = Number(req.params.id);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({
      error: 'Invalid patient ID'
    });
  }

  const now = new Date().toISOString();

 const patient = db.prepare(`
  SELECT id, hospital_id, name, deleted_at
  FROM patients
  WHERE id = ?
    AND hospital_id = ?
`).get(patientId, HOSPITAL_ID);

 if (!patient) {
  return res.status(404).json({
    error: 'Patient not found'
  });
}

  try {
    // Soft-delete medicines belonging to this patient's visits.
    db.prepare(`
      UPDATE medicines
      SET
        deleted_at = ?,
        updated_at = ?
      WHERE visit_id IN (
        SELECT id
        FROM visits
        WHERE patient_id = ?
          AND hospital_id = ?
          AND deleted_at IS NULL
      )
      AND deleted_at IS NULL
    `).run(
      now,
      now,
      patientId,
      HOSPITAL_ID
    );

    // Soft-delete visits belonging to the patient.
    db.prepare(`
      UPDATE visits
      SET
        deleted_at = ?,
        updated_at = ?
      WHERE patient_id = ?
        AND hospital_id = ?
        AND deleted_at IS NULL
    `).run(
      now,
      now,
      patientId,
      HOSPITAL_ID
    );

    // Soft-delete the patient itself.
    db.prepare(`
      UPDATE patients
      SET
        deleted_at = ?,
        updated_at = ?
      WHERE id = ?
        AND hospital_id = ?
        AND deleted_at IS NULL
    `).run(
      now,
      now,
      patientId,
      HOSPITAL_ID
    );

    res.status(204).send();
  } catch (error) {

    return res.status(500).json({
      error: 'Failed to delete patient'
    });
  }
});

module.exports = router;