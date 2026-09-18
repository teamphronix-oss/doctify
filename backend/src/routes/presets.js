const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /presets?type=Tablet&language=mr-IN - powers the "Preset Instructions" dropdown
router.get('/', (req, res) => {
  const { type, language } = req.query;
  let rows;
  if (type && language) {
    rows = db.prepare(
      'SELECT * FROM presets WHERE medicine_type = ? AND language = ? ORDER BY id'
    ).all(type, language);
  } else {
    rows = db.prepare('SELECT * FROM presets ORDER BY medicine_type, language, id').all();
  }
  res.json(rows);
});

// POST /presets - the "+ Add New Preset" modal from the old app
router.post('/', (req, res) => {
  const { medicine_type, language, label, morning, afternoon, night, food_timing, hospital_id } = req.body;
  if (!medicine_type || !language || !label) {
    return res.status(400).json({ error: 'medicine_type, language, and label are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO presets (hospital_id, medicine_type, language, label, morning, afternoon, night, food_timing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    hospital_id || null, medicine_type, language, label,
    morning ? 1 : 0, afternoon ? 1 : 0, night ? 1 : 0, food_timing || 'Before'
  );
  res.status(201).json(db.prepare('SELECT * FROM presets WHERE id = ?').get(result.lastInsertRowid));
});


router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM presets WHERE id = ?').run(req.params.id);
  res.status(204).send();
});


module.exports = router;
