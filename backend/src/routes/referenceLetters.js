const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.post('/', (req, res) => {
  const { patient_name, referred_to, reason, urgency, reference_text } = req.body;
  if (!reference_text) return res.status(400).json({ error: 'reference_text is required' });
  const stmt = db.prepare(`
    INSERT INTO reference_letters (hospital_id, patient_name, referred_to, reason, urgency, reference_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.auth.hospitalId, patient_name || null, referred_to || null,
    reason || null, urgency || 'Routine', reference_text
  );
  res.status(201).json(db.prepare('SELECT * FROM reference_letters WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/', (req, res) => {
  res.json(
    db.prepare('SELECT * FROM reference_letters WHERE hospital_id = ? ORDER BY created_at DESC')
      .all(req.auth.hospitalId)
  );
});

module.exports = router;
