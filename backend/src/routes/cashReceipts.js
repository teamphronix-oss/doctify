const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.post('/', (req, res) => {
  const {
    patient_name, age_sex, amount, amount_words, description,
    consult_date, custom_date, hospital_id,
  } = req.body;
  if (!patient_name || !amount || !consult_date) {
    return res.status(400).json({ error: 'patient_name, amount, and consult_date are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO cash_receipts
      (hospital_id, patient_name, age_sex, amount, amount_words, description, consult_date, custom_date, payment_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `);
  const result = stmt.run(
    hospital_id || 1, patient_name, age_sex || null, amount, amount_words || null,
    description || null, consult_date, custom_date || null
  );
  res.status(201).json(db.prepare('SELECT * FROM cash_receipts WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM cash_receipts ORDER BY created_at DESC').all());
});

// --- Future feature stub, discussed but NOT wired to a real payment
// gateway yet. A Razorpay/PhonePe webhook would call this endpoint the
// moment a QR payment succeeds, and a receipt gets created automatically
// with zero manual typing. Left here, disabled by default, so the shape
// of the feature is already in place when you're ready to build it for real.
router.post('/gateway-webhook', (req, res) => {
  return res.status(501).json({
    message: 'Not yet connected to a real payment gateway. See TODO in this file.',
  });

  // Real version would look roughly like this, once a gateway is chosen:
  //
  // const { patient_name, amount, gateway_reference, hospital_id } = req.body;
  // const stmt = db.prepare(`
  //   INSERT INTO cash_receipts
  //     (hospital_id, patient_name, amount, consult_date, payment_source, gateway_reference)
  //   VALUES (?, ?, ?, date('now'), 'gateway', ?)
  // `);
  // const result = stmt.run(hospital_id || 1, patient_name, amount, gateway_reference);
  // res.status(201).json(db.prepare('SELECT * FROM cash_receipts WHERE id = ?').get(result.lastInsertRowid));
});

module.exports = router;
