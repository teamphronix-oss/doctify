const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// ---- Fitness Certificate ----
router.post('/fitness', (req, res) => {
  const { patient_name, age, gender, examination_date, fitness_type, hospital_id } = req.body;
  if (!patient_name || !examination_date || !fitness_type) {
    return res.status(400).json({ error: 'patient_name, examination_date, and fitness_type are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO fitness_certificates (hospital_id, patient_name, age, gender, examination_date, fitness_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(hospital_id || 1, patient_name, age || null, gender || null, examination_date, fitness_type);
  res.status(201).json(db.prepare('SELECT * FROM fitness_certificates WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/fitness', (req, res) => {
  res.json(db.prepare('SELECT * FROM fitness_certificates ORDER BY created_at DESC').all());
});

// ---- Illness Certificate ----
router.post('/illness', (req, res) => {
  const {
    patient_name, age, gender, examination_date,
    diagnosis, start_date, end_date, resume_date, hospital_id,
  } = req.body;
  if (!patient_name || !examination_date || !diagnosis || !start_date || !end_date) {
    return res.status(400).json({
      error: 'patient_name, examination_date, diagnosis, start_date, and end_date are required',
    });
  }
  const stmt = db.prepare(`
    INSERT INTO illness_certificates
      (hospital_id, patient_name, age, gender, examination_date, diagnosis, start_date, end_date, resume_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    hospital_id || 1, patient_name, age || null, gender || null,
    examination_date, diagnosis, start_date, end_date, resume_date || null
  );
  res.status(201).json(db.prepare('SELECT * FROM illness_certificates WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/illness', (req, res) => {
  res.json(db.prepare('SELECT * FROM illness_certificates ORDER BY created_at DESC').all());
});

module.exports = router;
