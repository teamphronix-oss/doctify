const express = require('express');
const db = require('../db/connection');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /reports/summary
|--------------------------------------------------------------------------
| Dashboard/report summary.
*/
router.get('/summary', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();

  if (!isDateOnly(from) || !isDateOnly(to)) {
    return res.status(400).json({
      error: 'from and to are required in YYYY-MM-DD format',
    });
  }

  if (from > to) {
    return res.status(400).json({
      error: 'from date cannot be after to date',
    });
  }

  try {
    const fromStart = `${from} 00:00:00`;
    const toExclusive = `${addOneDay(to)} 00:00:00`;

    /*
     * OPD statistics
     *
     * visits table does NOT have hospital_id,
     * so hospital is filtered through patients.hospital_id.
     */
    const opd = db.prepare(`
      SELECT
        COUNT(DISTINCT v.patient_id) AS patients,

        COUNT(v.id) AS visits,

        COUNT(
          DISTINCT CASE
            WHEN NOT EXISTS (
              SELECT 1
              FROM visits previous
              WHERE previous.patient_id = v.patient_id
                AND (
                  previous.visit_date < v.visit_date
                  OR (
                    previous.visit_date = v.visit_date
                    AND previous.id < v.id
                  )
                )
            )
            THEN v.patient_id
          END
        ) AS newPatients,

        COUNT(
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM visits previous
              WHERE previous.patient_id = v.patient_id
                AND (
                  previous.visit_date < v.visit_date
                  OR (
                    previous.visit_date = v.visit_date
                    AND previous.id < v.id
                  )
                )
            )
            THEN 1
          END
        ) AS followUps

      FROM visits v

      INNER JOIN patients p
        ON p.id = v.patient_id

      WHERE p.hospital_id = ?
        AND v.visit_date >= ?
        AND v.visit_date < ?
    `).get(
      HOSPITAL_ID,
      fromStart,
      toExclusive
    );

    /*
     * Cash receipts
     */
    const revenue = db.prepare(`
      SELECT
        COUNT(*) AS receipts,
        COALESCE(SUM(amount), 0) AS total

      FROM cash_receipts

      WHERE hospital_id = ?
        AND consult_date >= ?
        AND consult_date <= ?
    `).get(
      HOSPITAL_ID,
      from,
      to
    );


    const totalPatients = db.prepare(`
  SELECT COUNT(*) AS count
  FROM patients
  WHERE hospital_id = ?
    AND deleted_at IS NULL
`).get(HOSPITAL_ID);

const todayPatients = db.prepare(`
  SELECT
    p.id,
    p.name,
    p.age,
    p.gender,
    p.phone,
    v.visit_date,
    v.diagnosis
  FROM visits v
  INNER JOIN patients p ON p.id = v.patient_id
  WHERE p.hospital_id = ?
    AND p.deleted_at IS NULL
    AND v.deleted_at IS NULL
    AND date(v.visit_date) = ?
    AND v.id = (
      SELECT v2.id
      FROM visits v2
      WHERE v2.patient_id = v.patient_id
        AND v2.deleted_at IS NULL
        AND date(v2.visit_date) = ?
      ORDER BY v2.visit_date DESC, v2.id DESC
      LIMIT 1
    )
  ORDER BY v.visit_date DESC, v.id DESC
`).all(HOSPITAL_ID, from, from);

    /*
     * Fitness certificates
     */
    const fitness = db.prepare(`
      SELECT COUNT(*) AS count

      FROM fitness_certificates

      WHERE hospital_id = ?
        AND examination_date >= ?
        AND examination_date <= ?
    `).get(
      HOSPITAL_ID,
      from,
      to
    );

    /*
     * Illness certificates
     */
    const illness = db.prepare(`
      SELECT COUNT(*) AS count

      FROM illness_certificates

      WHERE hospital_id = ?
        AND examination_date >= ?
        AND examination_date <= ?
    `).get(
      HOSPITAL_ID,
      from,
      to
    );

    /*
     * Reference letters
     */
    const references = db.prepare(`
      SELECT COUNT(*) AS count

      FROM reference_letters

      WHERE hospital_id = ?
        AND created_at >= ?
        AND created_at < ?
    `).get(
      HOSPITAL_ID,
      fromStart,
      toExclusive
    );

    /*
     * Daily OPD trend
     */
    const daily = db.prepare(`
      SELECT
        date(v.visit_date) AS date,
        COUNT(DISTINCT v.patient_id) AS patients,
        COUNT(v.id) AS visits

      FROM visits v

      INNER JOIN patients p
        ON p.id = v.patient_id

      WHERE p.hospital_id = ?
        AND v.visit_date >= ?
        AND v.visit_date < ?

      GROUP BY date(v.visit_date)

      ORDER BY date(v.visit_date)
    `).all(
      HOSPITAL_ID,
      fromStart,
      toExclusive
    );

    return res.json({
      period: {
        from,
        to,
      },

      totalPatients: Number(totalPatients?.count || 0),
todayPatients,

      opd: {
        patients: Number(opd?.patients || 0),
        visits: Number(opd?.visits || 0),
        newPatients: Number(opd?.newPatients || 0),
        followUps: Number(opd?.followUps || 0),
      },

      revenue: {
        receipts: Number(revenue?.receipts || 0),
        total: Number(revenue?.total || 0),
      },

      documents: {
        fitnessCertificates: Number(fitness?.count || 0),
        illnessCertificates: Number(illness?.count || 0),
        referenceLetters: Number(references?.count || 0),
      },

      daily,
    });

  } catch (err) {
    console.error('Reports summary failed:', err);

    return res.status(500).json({
      error: 'Failed to generate report summary',
    });
  }
});


/*
|--------------------------------------------------------------------------
| GET /reports/monthly
|--------------------------------------------------------------------------
|
| Query:
|
|   /reports/monthly?from=2026-09-01&to=2026-09-30
|
| Returns actual records required for:
|
|   - Patient Report
|   - Illness Certificate Report
|   - Cash Receipt Report
|   - Fitness Certificate Report
|   - Reference Letter Report
|
|--------------------------------------------------------------------------
*/
router.get('/monthly', (req, res) => {
  const HOSPITAL_ID = req.auth.hospitalId;
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();

  if (!isDateOnly(from) || !isDateOnly(to)) {
    return res.status(400).json({
      error: 'from and to are required in YYYY-MM-DD format',
    });
  }

  if (from > to) {
    return res.status(400).json({
      error: 'from date cannot be after to date',
    });
  }

  try {
    const fromStart = `${from} 00:00:00`;
    const toExclusive = `${addOneDay(to)} 00:00:00`;


    /*
    |--------------------------------------------------------------------------
    | 1. PATIENT REPORT
    |--------------------------------------------------------------------------
    */

    const visits = db.prepare(`
      SELECT
        v.id,
        v.patient_id,
        v.visit_date,

        p.name AS patient_name,
        p.phone AS patient_phone,
        p.age AS patient_age,
        p.gender AS patient_gender,

        CASE
          WHEN EXISTS (
            SELECT 1

            FROM visits previous

            WHERE previous.patient_id = v.patient_id

              AND (
                previous.visit_date < v.visit_date

                OR (
                  previous.visit_date = v.visit_date
                  AND previous.id < v.id
                )
              )
          )

          THEN 'Follow-up'

          ELSE 'New'

        END AS visit_type

      FROM visits v

      INNER JOIN patients p
        ON p.id = v.patient_id

      WHERE p.hospital_id = ?

        AND v.visit_date >= ?
        AND v.visit_date < ?

      ORDER BY
        v.visit_date ASC,
        v.id ASC
    `).all(
      HOSPITAL_ID,
      fromStart,
      toExclusive
    );


    /*
    |--------------------------------------------------------------------------
    | 2. ILLNESS CERTIFICATE REPORT
    |--------------------------------------------------------------------------
    */

    const illness = db.prepare(`
      SELECT
        id,
        patient_name,
        age,
        gender,
        examination_date,
        diagnosis,
        start_date,
        end_date,
        resume_date

      FROM illness_certificates

      WHERE hospital_id = ?

        AND examination_date >= ?
        AND examination_date <= ?

      ORDER BY
        examination_date ASC,
        id ASC
    `).all(
      HOSPITAL_ID,
      from,
      to
    );


    /*
    |--------------------------------------------------------------------------
    | 3. CASH RECEIPT REPORT
    |--------------------------------------------------------------------------
    */

    const receipts = db.prepare(`
      SELECT
        id,
        patient_name,
        consult_date,
        amount,
        description

      FROM cash_receipts

      WHERE hospital_id = ?

        AND consult_date >= ?
        AND consult_date <= ?

      ORDER BY
        consult_date ASC,
        id ASC
    `).all(
      HOSPITAL_ID,
      from,
      to
    );


    /*
    |--------------------------------------------------------------------------
    | 4. FITNESS CERTIFICATE REPORT
    |--------------------------------------------------------------------------
    */

    const fitness = db.prepare(`
      SELECT
        id,
        patient_name,
        age,
        gender,
        examination_date,
        fitness_type

      FROM fitness_certificates

      WHERE hospital_id = ?

        AND examination_date >= ?
        AND examination_date <= ?

      ORDER BY
        examination_date ASC,
        id ASC
    `).all(
      HOSPITAL_ID,
      from,
      to
    );


    /*
    |--------------------------------------------------------------------------
    | 5. REFERENCE LETTER REPORT
    |--------------------------------------------------------------------------
    */

    const references = db.prepare(`
      SELECT
        id,
        patient_name,
        created_at,
        referred_to,
        reason,
        urgency

      FROM reference_letters

      WHERE hospital_id = ?

        AND created_at >= ?
        AND created_at < ?

      ORDER BY
        created_at ASC,
        id ASC
    `).all(
      HOSPITAL_ID,
      fromStart,
      toExclusive
    );


    /*
    |--------------------------------------------------------------------------
    | RETURN NORMALIZED REPORT DATA
    |--------------------------------------------------------------------------
    */

    return res.json({

      period: {
        from,
        to,
      },


      /*
      |--------------------------------------------------------------------------
      | Patient report
      |--------------------------------------------------------------------------
      */

      patientReport: visits.map((v) => ({
        id: Number(v.id),

        patientId: Number(v.patient_id),

        date: v.visit_date,

        patientName: v.patient_name || '',

        phone: v.patient_phone || '',

        age:
          v.patient_age === null ||
          v.patient_age === undefined
            ? ''
            : Number(v.patient_age),

        gender: genderLabel(v.patient_gender),

        visitType: v.visit_type,
      })),


      /*
      |--------------------------------------------------------------------------
      | Illness certificates
      |--------------------------------------------------------------------------
      */

      illnessReport: illness.map((c) => ({
        id: Number(c.id),

        patientName: c.patient_name || '',

        age:
          c.age === null ||
          c.age === undefined
            ? ''
            : Number(c.age),

        gender: genderLabel(c.gender),

        examinationDate: c.examination_date || '',

        diagnosis: c.diagnosis || '',

        startDate: c.start_date || '',

        endDate: c.end_date || '',

        resumeDate: c.resume_date || '',
      })),


      /*
      |--------------------------------------------------------------------------
      | Cash receipts
      |--------------------------------------------------------------------------
      */

      cashReceiptReport: receipts.map((r) => ({
        id: Number(r.id),

        receiptNo:
          `RCP-${String(r.id).padStart(4, '0')}`,

        patientName: r.patient_name || '',

        date: r.consult_date || '',

        description: r.description || '',

        amount: Number(r.amount || 0),
      })),


      /*
      |--------------------------------------------------------------------------
      | Fitness certificates
      |--------------------------------------------------------------------------
      */

      fitnessReport: fitness.map((c) => ({
        id: Number(c.id),

        patientName: c.patient_name || '',

        age:
          c.age === null ||
          c.age === undefined
            ? ''
            : Number(c.age),

        gender: genderLabel(c.gender),

        examinationDate: c.examination_date || '',

        fitnessType: c.fitness_type || '',
      })),


      /*
      |--------------------------------------------------------------------------
      | Reference letters
      |--------------------------------------------------------------------------
      */

      referenceLetterReport: references.map((r) => ({
        id: Number(r.id),

        patientName: r.patient_name || '',

        date:
          (r.created_at || '').slice(0, 10),

        referredTo: r.referred_to || '',

        reason: r.reason || '',

        urgency:
          r.urgency || 'Routine',
      })),
    });

  } catch (err) {

    console.error(
      'Monthly report failed:',
      err
    );

    return res.status(500).json({
      error: 'Failed to generate monthly report',
    });
  }
});


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function genderLabel(value) {
  if (value === 'M') {
    return 'Male';
  }

  if (value === 'F') {
    return 'Female';
  }

  return value || '';
}


function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}


function addOneDay(value) {
  const date =
    new Date(`${value}T00:00:00Z`);

  date.setUTCDate(
    date.getUTCDate() + 1
  );

  return date
    .toISOString()
    .slice(0, 10);
}


module.exports = router;