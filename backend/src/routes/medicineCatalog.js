const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /medicine-catalog?q=para - powers the medicine name autocomplete
router.get('/', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    rows = db.prepare('SELECT * FROM medicine_catalog WHERE name LIKE ? ORDER BY name').all(`%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM medicine_catalog ORDER BY name').all();
  }
  res.json(rows);
});

// POST /medicine-catalog - add a new medicine to the list (grows over time as doctors type new ones)
router.post('/', (req, res) => {
  const { name, type, hospital_id } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const stmt = db.prepare('INSERT INTO medicine_catalog (hospital_id, name, type) VALUES (?, ?, ?)');
  const result = stmt.run(hospital_id || null, name, type);
  res.status(201).json(db.prepare('SELECT * FROM medicine_catalog WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM medicine_catalog WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
