const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /medicine-catalog?q=para - powers the medicine name autocomplete
router.get('/', (req, res) => {
  const { q } = req.query;
  const hospitalId = req.auth.hospitalId;
  let rows;
  if (q) {
    rows = db.prepare(
      'SELECT * FROM medicine_catalog WHERE (hospital_id IS NULL OR hospital_id = ?) AND name LIKE ? ORDER BY name'
    ).all(hospitalId, `%${q}%`);
  } else {
    rows = db.prepare(
      'SELECT * FROM medicine_catalog WHERE hospital_id IS NULL OR hospital_id = ? ORDER BY name'
    ).all(hospitalId);
  }
  res.json(rows);
});

// POST /medicine-catalog - add a new medicine to the list (grows over time as doctors type new ones)
router.post('/', (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const stmt = db.prepare('INSERT INTO medicine_catalog (hospital_id, name, type) VALUES (?, ?, ?)');
  const result = stmt.run(req.auth.hospitalId, name, type);
  res.status(201).json(db.prepare('SELECT * FROM medicine_catalog WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  // A clinic can only delete medicines it added itself - the shared
  // starter list belongs to every clinic.
  const result = db.prepare(
    'DELETE FROM medicine_catalog WHERE id = ? AND hospital_id = ?'
  ).run(req.params.id, req.auth.hospitalId);

  if (!result.changes) {
    return res.status(403).json({
      error: 'Only medicines added by your own clinic can be deleted.',
    });
  }

  res.status(204).send();
});

module.exports = router;
