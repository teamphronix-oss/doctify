const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.post('/', (req, res) => {
  const { patient_name, referred_to, reason, urgency, reference_text, hospital_id } = req.body;
  if (!reference_text) return res.status(400).json({ error: 'reference_text is required' });
  const stmt = db.prepare(`
    INSERT INTO reference_letters (hospital_id, patient_name, referred_to, reason, urgency, reference_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    hospital_id || 1, patient_name || null, referred_to || null,
    reason || null, urgency || 'Routine', reference_text
  );
  res.status(201).json(db.prepare('SELECT * FROM reference_letters WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM reference_letters ORDER BY created_at DESC').all());
});

module.exports = router;
