const express = require('express');
const router = express.Router();

const {
  listClinicsForUser,
  getClinicForUser,
  createClinic,
  updateClinic,
  archiveClinic,
} = require('../services/clinicService');

// A generous cap on the stored banner image (it's a base64 data: URL).
// The frontend already downsizes/compresses images before upload, so a
// normal letterhead photo lands well under this.
const MAX_BANNER_LENGTH = 2_000_000; // ~1.5 MB of actual image data

function readDetails(body) {
  const clean = (value) => String(value ?? '').trim();

  const details = {
    name: clean(body?.name),
    address: clean(body?.address),
    doctorName: clean(body?.doctorName),
    qualification: clean(body?.qualification),
    regNo: clean(body?.regNo),
  };

  // Only touch bannerImage if the caller actually sent the field, so
  // edits that don't mention it never erase an existing banner.
  if (body && Object.prototype.hasOwnProperty.call(body, 'bannerImage')) {
    details.bannerImage = clean(body.bannerImage);
  }

  return details;
}

function bannerTooLarge(details) {
  return !!details.bannerImage && details.bannerImage.length > MAX_BANNER_LENGTH;
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

  if (bannerTooLarge(details)) {
    return res.status(413).json({ error: 'Banner image is too large. Please use a smaller image.' });
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

  if (bannerTooLarge(details)) {
    return res.status(413).json({ error: 'Banner image is too large. Please use a smaller image.' });
  }

  updateClinic(clinic.id, details);

  res.json(getClinicForUser(req.auth.userId, clinic.id));
});

// DELETE /clinics/:id - removes a clinic (soft delete: it's kept in the
// database, just hidden and its login code stops working). A doctor can
// never remove their only clinic - that would lock them out entirely.
router.delete('/:id', (req, res) => {
  const clinic = getClinicForUser(req.auth.userId, req.params.id);

  if (!clinic) {
    return res.status(403).json({
      error: 'You do not have access to this clinic.',
    });
  }

  const totalClinics = listClinicsForUser(req.auth.userId).length;

  if (totalClinics <= 1) {
    return res.status(400).json({
      error: 'This is your only clinic and cannot be removed. Add another clinic first.',
    });
  }

  archiveClinic(clinic.id);
  res.status(204).send();
});

module.exports = router;
