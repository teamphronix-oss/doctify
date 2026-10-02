const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /presets?type=Tablet&language=mr-IN - powers the "Preset Instructions" dropdown
router.get('/', (req, res) => {
  const { type, language } = req.query;
  const hospitalId = req.auth.hospitalId;
  let rows;
  if (type && language) {
    rows = db.prepare(
      'SELECT * FROM presets WHERE (hospital_id IS NULL OR hospital_id = ?) AND medicine_type = ? AND language = ? ORDER BY id'
    ).all(hospitalId, type, language);
  } else {
    rows = db.prepare(
      'SELECT * FROM presets WHERE hospital_id IS NULL OR hospital_id = ? ORDER BY medicine_type, language, id'
    ).all(hospitalId);
  }
  res.json(rows);
});

// POST /presets - the "+ Add New Preset" modal from the old app
router.post('/', (req, res) => {
  const { medicine_type, language, label, morning, afternoon, night, food_timing } = req.body;
  if (!medicine_type || !language || !label) {
    return res.status(400).json({ error: 'medicine_type, language, and label are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO presets (hospital_id, medicine_type, language, label, morning, afternoon, night, food_timing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    req.auth.hospitalId, medicine_type, language, label,
    morning ? 1 : 0, afternoon ? 1 : 0, night ? 1 : 0, food_timing || 'Before'
  );
  res.status(201).json(db.prepare('SELECT * FROM presets WHERE id = ?').get(result.lastInsertRowid));
});


router.delete('/:id', (req, res) => {
  // A clinic can only delete presets it added itself - the shared
  // starter presets belong to every clinic.
  const result = db.prepare(
    'DELETE FROM presets WHERE id = ? AND hospital_id = ?'
  ).run(req.params.id, req.auth.hospitalId);

  if (!result.changes) {
    return res.status(403).json({
      error: 'Only presets added by your own clinic can be deleted.',
    });
  }

  res.status(204).send();
});


module.exports = router;
