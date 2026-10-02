const express = require('express');
const router = express.Router();

const {
  listClinicsForUser,
  getClinicForUser,
  createClinic,
  updateClinic,
} = require('../services/clinicService');

function readDetails(body) {
  const clean = (value) => String(value ?? '').trim();

  return {
    name: clean(body?.name),
    address: clean(body?.address),
    doctorName: clean(body?.doctorName),
    qualification: clean(body?.qualification),
    regNo: clean(body?.regNo),
  };
}

// GET /clinics - the clinics this doctor can open
router.get('/', (req, res) => {
  res.json(listClinicsForUser(req.auth.userId));
});

// POST /clinics - add a new clinic. It starts empty; its data is
// completely separate from the doctor's other clinics.
router.post('/', (req, res) => {
  const details = readDetails(req.body);

  if (!details.name) {
    return res.status(400).json({ error: 'Clinic name is required.' });
  }

  try {
    res.status(201).json(createClinic(req.auth.userId, details));
  } catch (error) {
    console.error('[CLINICS] Create failed:', error);
    res.status(500).json({ error: 'Failed to create clinic.' });
  }
});

// PATCH /clinics/:id - edit clinic details (name, address, doctor...)
router.patch('/:id', (req, res) => {
  const clinic = getClinicForUser(req.auth.userId, req.params.id);

  if (!clinic) {
    return res.status(403).json({
      error: 'You do not have access to this clinic.',
    });
  }

  if (!['owner', 'doctor'].includes(clinic.role)) {
    return res.status(403).json({
      error: 'You are not allowed to edit this clinic.',
    });
  }

  const details = readDetails(req.body);

  if (!details.name) {
    return res.status(400).json({ error: 'Clinic name is required.' });
  }

  updateClinic(clinic.id, details);

  res.json(getClinicForUser(req.auth.userId, clinic.id));
});

module.exports = router;
