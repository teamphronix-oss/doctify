const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// POST /visits - "Preview & Save Prescription" - creates one visit + its medicines
router.post('/', (req, res) => {
  const {
    patient_id,
    bp, pulse, spo2, weight, height, temp,
    past_history, allergies, complaints, oe, quick_note, diagnosis,
    suggestions, investigations, opd_medicine,
    follow_up_period, follow_up_unit,
    medicines, // array of { type, name, language, instructions, morning, afternoon, night, food_timing, quantity }
  } = req.body;

  if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

  const insertVisit = db.prepare(`
    INSERT INTO visits (
      patient_id, bp, pulse, spo2, weight, height, temp,
      past_history, allergies, complaints, oe, quick_note, diagnosis,
      suggestions, investigations, opd_medicine,
      follow_up_period, follow_up_unit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedicine = db.prepare(`
    INSERT INTO medicines (
      visit_id, type, name, language, instructions, morning, afternoon, night, food_timing, quantity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Wrap in a transaction: visit + all its medicines succeed or fail together.
  // node:sqlite (unlike better-sqlite3) has no db.transaction() helper, so
  // this is done manually with BEGIN/COMMIT/ROLLBACK.
  let visitId;
  try {
    db.exec('BEGIN');

    const result = insertVisit.run(
      patient_id, bp || null, pulse || null, spo2 || null, weight || null, height || null, temp || null,
      past_history || null, allergies || null, complaints || null, oe || null, quick_note || null, diagnosis || null,
      suggestions || null, investigations || null, opd_medicine || null,
      follow_up_period || null, follow_up_unit || null
    );
    visitId = result.lastInsertRowid;

    (medicines || []).forEach((med) => {
      insertMedicine.run(
        visitId,
        med.type || 'Tablet',
        med.name,
        med.language || 'mr-IN',
        med.instructions || null,
        med.morning ? 1 : 0,
        med.afternoon ? 1 : 0,
        med.night ? 1 : 0,
        med.food_timing || 'Before',
        med.quantity || 1
      );
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to save prescription', details: err.message });
  }

  res.status(201).json(getFullVisit(visitId));
});

// GET /visits/patient/:patientId - all visits for one patient (Last Visit History)
router.get('/patient/:patientId', (req, res) => {
  const visits = db.prepare(
    'SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC'
  ).all(req.params.patientId);
  res.json(visits.map((v) => attachMedicines(v)));
});

// GET /visits/:id - one visit with its medicines (Print Preview / Prescription Report)
router.get('/:id', (req, res) => {
  const visit = getFullVisit(req.params.id);
  if (!visit) return res.status(404).json({ error: 'Visit not found' });
  res.json(visit);
});

function attachMedicines(visit) {
  const medicines = db.prepare('SELECT * FROM medicines WHERE visit_id = ?').all(visit.id);
  return { ...visit, medicines };
}

function getFullVisit(id) {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(id);
  if (!visit) return null;
  return attachMedicines(visit);
}

module.exports = router;
