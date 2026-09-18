const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const db = require('../db/connection');

const HOSPITAL_ID = Number(process.env.HOSPITAL_ID || 1);

/*
 * Doctify human-readable export service
 * --------------------------------------
 * The SQLite .db backup remains the complete technical restore source.
 * This file creates doctor-friendly PDF/Excel exports only.
 *
 * IMPORTANT:
 * - Never expose sync_id, internal ids, hospital_id, *_sync_id,
 *   updated_at, deleted_at, or sync tables in the human exports.
 * - Visits use visit_date. There is intentionally NO v.created_at
 *   reference because the visits table does not require that column.
 */

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function tableExists(tableName) {
  return Boolean(
    db.prepare(`
      SELECT 1
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
      LIMIT 1
    `).get(tableName)
  );
}

function columnsFor(tableName) {
  if (!tableExists(tableName)) return [];

  return db.prepare(
    `PRAGMA table_info(${quoteIdentifier(tableName)})`
  ).all().map((row) => row.name);
}

function hasColumn(tableName, columnName) {
  return columnsFor(tableName).includes(columnName);
}

function firstColumn(tableName, candidates) {
  const columns = columnsFor(tableName);

  return candidates.find((name) => columns.includes(name)) || null;
}

function cleanText(value, fallback = '—') {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();

  return text ? text : fallback;
}

function excelText(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return '—';

  const raw = String(value);
  const datePart = raw.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return raw;
  }

  const [year, month, day] = datePart.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function languageName(value) {
  const code = String(value || '').toLowerCase();

  if (code.includes('mr')) return 'Marathi';
  if (code.includes('hi')) return 'Hindi';
  if (code.includes('en')) return 'English';

  return cleanText(value);
}

function dosageText(medicine) {
  const parts = [];

  if (
    Number(medicine.morning) === 1 ||
    medicine.morning === true
  ) {
    parts.push('Morning');
  }

  if (
    Number(medicine.afternoon) === 1 ||
    medicine.afternoon === true
  ) {
    parts.push('Afternoon');
  }

  if (
    Number(medicine.night) === 1 ||
    medicine.night === true
  ) {
    parts.push('Night');
  }

  return parts.length ? parts.join(' + ') : '—';
}

function foodTimingText(value) {
  if (!value) return '—';

  const text = String(value).trim().toLowerCase();

  if (text === 'before') return 'Before food';
  if (text === 'after') return 'After food';

  return String(value);
}

function clinicName() {
  if (!tableExists('hospitals')) {
    return 'Doctify Clinic';
  }

  const row = db.prepare(`
    SELECT name
    FROM hospitals
    WHERE id = ?
    LIMIT 1
  `).get(HOSPITAL_ID);

  return cleanText(row?.name, 'Doctify Clinic');
}

function patientName(patientId) {
  if (!patientId || !tableExists('patients')) {
    return '—';
  }

  const row = db.prepare(`
    SELECT name
    FROM patients
    WHERE id = ?
    LIMIT 1
  `).get(patientId);

  return cleanText(row?.name);
}

function familyName(familyId) {
  if (!familyId || !tableExists('families')) {
    return '';
  }

  const family = db.prepare(`
    SELECT *
    FROM families
    WHERE id = ?
    LIMIT 1
  `).get(familyId);

  if (!family) {
    return '';
  }

  const candidates = [
    family.name,
    family.family_name,
    family.familyName,
    family.label,
    family.title,
    family.display_name,
    family.displayName,
  ];

  for (const candidate of candidates) {
    if (
      candidate !== null &&
      candidate !== undefined &&
      String(candidate).trim()
    ) {
      return String(candidate).trim();
    }
  }

  for (const column of columnsFor('families')) {
    if (
      [
        'id',
        'hospital_id',
        'sync_id',
        'updated_at',
        'deleted_at',
      ].includes(column)
    ) {
      continue;
    }

    const value = family[column];

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return '';
}

function getPatients() {
  if (!tableExists('patients')) {
    return [];
  }

  return db.prepare(`
    SELECT
      p.name,
      p.gender,
      p.age,
      p.phone,
      p.family_id
    FROM patients p
    WHERE p.hospital_id = ?
      AND p.deleted_at IS NULL
    ORDER BY p.name COLLATE NOCASE
  `).all(HOSPITAL_ID).map((p) => ({
    name: cleanText(p.name, 'Unnamed Patient'),
    gender: cleanText(p.gender),
    age:
      p.age === null || p.age === undefined
        ? '—'
        : p.age,
    phone: cleanText(p.phone),
    family:
      p.family_id
        ? familyName(p.family_id) || '—'
        : '—',
  }));
}

function getFamilies() {
  if (!tableExists('families')) {
    return [];
  }

  return db.prepare(`
    SELECT *
    FROM families
    WHERE hospital_id = ?
      AND deleted_at IS NULL
    ORDER BY id
  `).all(HOSPITAL_ID).map((family) => {
    const members = tableExists('patients')
      ? db.prepare(`
          SELECT name
          FROM patients
          WHERE hospital_id = ?
            AND family_id = ?
            AND deleted_at IS NULL
          ORDER BY name COLLATE NOCASE
        `).all(HOSPITAL_ID, family.id)
      : [];

    return {
      family:
        familyName(family.id) ||
        'Unnamed Family',

      members:
        members
          .map((m) => cleanText(m.name))
          .join(', ') ||
        'No active members',

      count: members.length,
    };
  });
}

function getVisits() {
  if (!tableExists('visits')) {
    return [];
  }

  const rows = db.prepare(`
    SELECT
      v.patient_id,
      v.visit_date,
      v.bp,
      v.pulse,
      v.spo2,
      v.weight,
      v.height,
      v.temp,
      v.past_history,
      v.allergies,
      v.complaints,
      v.oe,
      v.quick_note,
      v.diagnosis,
      v.suggestions,
      v.investigations,
      v.opd_medicine,
      v.follow_up_period,
      v.follow_up_unit,
      p.name AS patient_name
    FROM visits v
    LEFT JOIN patients p
      ON p.id = v.patient_id
    WHERE v.hospital_id = ?
      AND v.deleted_at IS NULL
      AND (
        p.id IS NULL
        OR p.deleted_at IS NULL
      )
    ORDER BY
      substr(v.visit_date, 1, 10) DESC,
      p.name COLLATE NOCASE
  `).all(HOSPITAL_ID);

  return rows.map((v) => ({
    patient:
      cleanText(
        v.patient_name,
        'Unknown Patient'
      ),

    date: formatDate(v.visit_date),

    dateRaw:
      v.visit_date || '',

    bp: cleanText(v.bp),

    pulse: cleanText(v.pulse),

    spo2: cleanText(v.spo2),

    weight: cleanText(v.weight),

    height: cleanText(v.height),

    temp: cleanText(v.temp),

    pastHistory:
      cleanText(v.past_history),

    allergies:
      cleanText(v.allergies),

    complaints:
      cleanText(v.complaints),

    oe:
      cleanText(v.oe),

    quickNote:
      cleanText(v.quick_note),

    diagnosis:
      cleanText(v.diagnosis),

    suggestions:
      cleanText(v.suggestions),

    investigations:
      cleanText(v.investigations),

    opdMedicine:
      cleanText(v.opd_medicine),

    followUp:
      v.follow_up_period !== null &&
        v.follow_up_period !== undefined &&
        String(v.follow_up_period).trim()
        ? `${v.follow_up_period} ${v.follow_up_unit || 'days'
        }`
        : '—',

    patientId:
      v.patient_id,
  }));
}

function getPrescriptions() {
  if (!tableExists('medicines')) {
    return [];
  }

  /*
   * IMPORTANT:
   * visits uses visit_date.
   * Do NOT change this to v.created_at.
   */
  const rows = db.prepare(`
    SELECT
      m.type,
      m.name,
      m.language,
      m.instructions,
      m.morning,
      m.afternoon,
      m.night,
      m.food_timing,
      m.quantity,
      v.visit_date,
      p.name AS patient_name
    FROM medicines m
    LEFT JOIN visits v
      ON v.id = m.visit_id
    LEFT JOIN patients p
      ON p.id = v.patient_id
    WHERE m.hospital_id = ?
      AND m.deleted_at IS NULL
      AND (
        v.id IS NULL
        OR v.deleted_at IS NULL
      )
      AND (
        p.id IS NULL
        OR p.deleted_at IS NULL
      )
    ORDER BY
      substr(v.visit_date, 1, 10) DESC,
      p.name COLLATE NOCASE,
      m.name COLLATE NOCASE
  `).all(HOSPITAL_ID);

  return rows.map((m) => ({
    patient:
      cleanText(
        m.patient_name,
        'Unknown Patient'
      ),

    date:
      formatDate(m.visit_date),

    type:
      cleanText(m.type),

    medicine:
      cleanText(m.name),

    language:
      languageName(m.language),

    instructions:
      cleanText(m.instructions),

    dosage:
      dosageText(m),

    timing:
      foodTimingText(m.food_timing),

    quantity:
      cleanText(m.quantity),
  }));
}

function getMedicineCatalog() {
  if (!tableExists('medicine_catalog')) {
    return [];
  }

  const columns =
    columnsFor('medicine_catalog');

  const nameColumn =
    firstColumn('medicine_catalog', [
      'name',
      'medicine_name',
      'label',
    ]);

  const typeColumn =
    firstColumn('medicine_catalog', [
      'type',
      'medicine_type',
    ]);

  if (!nameColumn) {
    return [];
  }

  const select = [
    `${quoteIdentifier(nameColumn)} AS name`,

    typeColumn
      ? `${quoteIdentifier(typeColumn)} AS type`
      : `'' AS type`,
  ].join(', ');

  return db.prepare(`
    SELECT ${select}
    FROM medicine_catalog
    ${hasColumn(
    'medicine_catalog',
    'deleted_at'
  )
      ? 'WHERE deleted_at IS NULL'
      : ''
    }
    ORDER BY
      ${quoteIdentifier(nameColumn)}
      COLLATE NOCASE
  `).all().map((m) => ({
      name: cleanText(m.name),
      type: cleanText(m.type),
    }));
}
function getIllnessCertificates() {
  if (!tableExists('illness_certificates')) {
    return [];
  }

  const columns = columnsFor(
    'illness_certificates'
  );

  const patientIdColumn =
    columns.includes('patient_id')
      ? 'patient_id'
      : null;

  const patientNameColumn =
    columns.includes('patient_name')
      ? 'patient_name'
      : null;

  const dateColumn =
    firstColumn('illness_certificates', [
      'examination_date',
      'issue_date',
      'certificate_date',
      'date',
    ]);

  const diagnosisColumn =
    firstColumn('illness_certificates', [
      'diagnosis',
      'illness',
      'reason',
      'description',
    ]);

  const startColumn =
    firstColumn('illness_certificates', [
      'start_date',
      'from_date',
      'leave_from',
    ]);

  const endColumn =
    firstColumn('illness_certificates', [
      'end_date',
      'to_date',
      'leave_to',
    ]);

  const resumeColumn =
    firstColumn('illness_certificates', [
      'resume_date',
      'joining_date',
      'return_date',
    ]);

  const ageColumn =
    firstColumn('illness_certificates', [
      'age',
      'patient_age',
    ]);

  const genderColumn =
    firstColumn('illness_certificates', [
      'gender',
      'patient_gender',
    ]);

  const select = [];

  if (patientIdColumn) {
    select.push(
      `${quoteIdentifier(
        patientIdColumn
      )} AS patient_id`
    );
  } else {
    select.push('NULL AS patient_id');
  }

  if (patientNameColumn) {
    select.push(
      `${quoteIdentifier(
        patientNameColumn
      )} AS patient_name`
    );
  } else {
    select.push(`'' AS patient_name`);
  }

  if (dateColumn) {
    select.push(
      `${quoteIdentifier(
        dateColumn
      )} AS examination_date`
    );
  } else {
    select.push(`NULL AS examination_date`);
  }

  if (diagnosisColumn) {
    select.push(
      `${quoteIdentifier(
        diagnosisColumn
      )} AS diagnosis`
    );
  } else {
    select.push(`'' AS diagnosis`);
  }

  if (startColumn) {
    select.push(
      `${quoteIdentifier(
        startColumn
      )} AS start_date`
    );
  } else {
    select.push(`NULL AS start_date`);
  }

  if (endColumn) {
    select.push(
      `${quoteIdentifier(
        endColumn
      )} AS end_date`
    );
  } else {
    select.push(`NULL AS end_date`);
  }

  if (resumeColumn) {
    select.push(
      `${quoteIdentifier(
        resumeColumn
      )} AS resume_date`
    );
  } else {
    select.push(`NULL AS resume_date`);
  }

  if (ageColumn) {
    select.push(
      `${quoteIdentifier(
        ageColumn
      )} AS age`
    );
  } else {
    select.push(`NULL AS age`);
  }

  if (genderColumn) {
    select.push(
      `${quoteIdentifier(
        genderColumn
      )} AS gender`
    );
  } else {
    select.push(`'' AS gender`);
  }

  let rows = [];

  try {
    rows = db.prepare(`
      SELECT ${select.join(', ')}
      FROM illness_certificates
      ${hasColumn(
      'illness_certificates',
      'deleted_at'
    )
        ? 'WHERE deleted_at IS NULL'
        : ''
      }
      ORDER BY
        ${dateColumn
        ? quoteIdentifier(dateColumn)
        : 'rowid'
      } DESC
    `).all();
  } catch (error) {
    console.warn(
      '[EXPORT] Unable to read illness certificates:',
      error.message
    );

    return [];
  }

  return rows.map((row) => ({
    patient:
      cleanText(
        row.patient_name,
        row.patient_id
          ? patientName(row.patient_id)
          : '—'
      ),

    examinationDate:
      formatDate(row.examination_date),

    age:
      row.age === null ||
        row.age === undefined
        ? '—'
        : row.age,

    gender:
      cleanText(row.gender),

    diagnosis:
      cleanText(row.diagnosis),

    startDate:
      formatDate(row.start_date),

    endDate:
      formatDate(row.end_date),

    resumeDate:
      formatDate(row.resume_date),
  }));
}

function getFitnessCertificates() {
  if (!tableExists('fitness_certificates')) {
    return [];
  }

  const columns = columnsFor(
    'fitness_certificates'
  );

  const patientIdColumn =
    columns.includes('patient_id')
      ? 'patient_id'
      : null;

  const patientNameColumn =
    columns.includes('patient_name')
      ? 'patient_name'
      : null;

  const dateColumn =
    firstColumn('fitness_certificates', [
      'examination_date',
      'issue_date',
      'certificate_date',
      'date',
    ]);

  const fitFromColumn =
    firstColumn('fitness_certificates', [
      'fit_from',
      'start_date',
      'from_date',
    ]);

  const fitUntilColumn =
    firstColumn('fitness_certificates', [
      'fit_until',
      'end_date',
      'to_date',
    ]);

  const purposeColumn =
    firstColumn('fitness_certificates', [
      'purpose',
      'reason',
      'description',
    ]);

  const ageColumn =
    firstColumn('fitness_certificates', [
      'age',
      'patient_age',
    ]);

  const genderColumn =
    firstColumn('fitness_certificates', [
      'gender',
      'patient_gender',
    ]);

  const select = [];

  if (patientIdColumn) {
    select.push(
      `${quoteIdentifier(
        patientIdColumn
      )} AS patient_id`
    );
  } else {
    select.push('NULL AS patient_id');
  }

  if (patientNameColumn) {
    select.push(
      `${quoteIdentifier(
        patientNameColumn
      )} AS patient_name`
    );
  } else {
    select.push(`'' AS patient_name`);
  }

  if (dateColumn) {
    select.push(
      `${quoteIdentifier(
        dateColumn
      )} AS examination_date`
    );
  } else {
    select.push(`NULL AS examination_date`);
  }

  if (fitFromColumn) {
    select.push(
      `${quoteIdentifier(
        fitFromColumn
      )} AS fit_from`
    );
  } else {
    select.push(`NULL AS fit_from`);
  }

  if (fitUntilColumn) {
    select.push(
      `${quoteIdentifier(
        fitUntilColumn
      )} AS fit_until`
    );
  } else {
    select.push(`NULL AS fit_until`);
  }

  if (purposeColumn) {
    select.push(
      `${quoteIdentifier(
        purposeColumn
      )} AS purpose`
    );
  } else {
    select.push(`'' AS purpose`);
  }

  if (ageColumn) {
    select.push(
      `${quoteIdentifier(
        ageColumn
      )} AS age`
    );
  } else {
    select.push(`NULL AS age`);
  }

  if (genderColumn) {
    select.push(
      `${quoteIdentifier(
        genderColumn
      )} AS gender`
    );
  } else {
    select.push(`'' AS gender`);
  }

  let rows = [];

  try {
    rows = db.prepare(`
      SELECT ${select.join(', ')}
      FROM fitness_certificates
      ${hasColumn(
      'fitness_certificates',
      'deleted_at'
    )
        ? 'WHERE deleted_at IS NULL'
        : ''
      }
      ORDER BY
        ${dateColumn
        ? quoteIdentifier(dateColumn)
        : 'rowid'
      } DESC
    `).all();
  } catch (error) {
    console.warn(
      '[EXPORT] Unable to read fitness certificates:',
      error.message
    );

    return [];
  }

  return rows.map((row) => ({
    patient:
      cleanText(
        row.patient_name,
        row.patient_id
          ? patientName(row.patient_id)
          : '—'
      ),

    examinationDate:
      formatDate(row.examination_date),

    age:
      row.age === null ||
        row.age === undefined
        ? '—'
        : row.age,

    gender:
      cleanText(row.gender),

    fitFrom:
      formatDate(row.fit_from),

    fitUntil:
      formatDate(row.fit_until),

    purpose:
      cleanText(row.purpose),
  }));
}

function getCashReceipts() {
  if (!tableExists('cash_receipts')) {
    return [];
  }

  const columns =
    columnsFor('cash_receipts');

  const patientIdColumn =
    columns.includes('patient_id')
      ? 'patient_id'
      : null;

  const patientNameColumn =
    columns.includes('patient_name')
      ? 'patient_name'
      : null;

  const dateColumn =
    firstColumn('cash_receipts', [
      'receipt_date',
      'payment_date',
      'date',
      'created_at',
    ]);

  const amountColumn =
    firstColumn('cash_receipts', [
      'amount',
      'total',
      'fee',
      'paid_amount',
    ]);

  const receiptColumn =
    firstColumn('cash_receipts', [
      'receipt_number',
      'receipt_no',
      'number',
    ]);

  const descriptionColumn =
    firstColumn('cash_receipts', [
      'description',
      'particulars',
      'remarks',
      'purpose',
    ]);

  const paymentModeColumn =
    firstColumn('cash_receipts', [
      'payment_mode',
      'payment_method',
      'mode',
    ]);

  const select = [];

  if (patientIdColumn) {
    select.push(
      `${quoteIdentifier(
        patientIdColumn
      )} AS patient_id`
    );
  } else {
    select.push('NULL AS patient_id');
  }

  if (patientNameColumn) {
    select.push(
      `${quoteIdentifier(
        patientNameColumn
      )} AS patient_name`
    );
  } else {
    select.push(`'' AS patient_name`);
  }

  if (dateColumn) {
    select.push(
      `${quoteIdentifier(
        dateColumn
      )} AS receipt_date`
    );
  } else {
    select.push(`NULL AS receipt_date`);
  }

  if (amountColumn) {
    select.push(
      `${quoteIdentifier(
        amountColumn
      )} AS amount`
    );
  } else {
    select.push(`NULL AS amount`);
  }

  if (receiptColumn) {
    select.push(
      `${quoteIdentifier(
        receiptColumn
      )} AS receipt_number`
    );
  } else {
    select.push(`'' AS receipt_number`);
  }

  if (descriptionColumn) {
    select.push(
      `${quoteIdentifier(
        descriptionColumn
      )} AS description`
    );
  } else {
    select.push(`'' AS description`);
  }

  if (paymentModeColumn) {
    select.push(
      `${quoteIdentifier(
        paymentModeColumn
      )} AS payment_mode`
    );
  } else {
    select.push(`'' AS payment_mode`);
  }

  let rows = [];

  try {
    rows = db.prepare(`
      SELECT ${select.join(', ')}
      FROM cash_receipts
      ${hasColumn(
      'cash_receipts',
      'hospital_id'
    )
        ? `WHERE hospital_id = ${HOSPITAL_ID}
             ${hasColumn(
          'cash_receipts',
          'deleted_at'
        )
          ? 'AND deleted_at IS NULL'
          : ''
        }`
        : hasColumn(
          'cash_receipts',
          'deleted_at'
        )
          ? 'WHERE deleted_at IS NULL'
          : ''
      }
      ORDER BY
        ${dateColumn
        ? quoteIdentifier(dateColumn)
        : 'rowid'
      } DESC
    `).all();
  } catch (error) {
    console.warn(
      '[EXPORT] Unable to read cash receipts:',
      error.message
    );

    return [];
  }

  return rows.map((row) => ({
    receiptNumber:
      cleanText(row.receipt_number),

    patient:
      cleanText(
        row.patient_name,
        row.patient_id
          ? patientName(row.patient_id)
          : '—'
      ),

    date:
      formatDate(row.receipt_date),

    amount:
      row.amount === null ||
        row.amount === undefined ||
        row.amount === ''
        ? '—'
        : row.amount,

    paymentMode:
      cleanText(row.payment_mode),

    description:
      cleanText(row.description),
  }));
}

function getReferenceLetters() {
  if (!tableExists('reference_letters')) {
    return [];
  }

  const columns =
    columnsFor('reference_letters');

  const patientIdColumn =
    columns.includes('patient_id')
      ? 'patient_id'
      : null;

  const patientNameColumn =
    columns.includes('patient_name')
      ? 'patient_name'
      : null;

  const dateColumn =
    firstColumn('reference_letters', [
      'letter_date',
      'issue_date',
      'date',
      'created_at',
    ]);

  const referenceColumn =
    firstColumn('reference_letters', [
      'reference',
      'reference_number',
      'letter_number',
      'number',
    ]);

  const purposeColumn =
    firstColumn('reference_letters', [
      'purpose',
      'subject',
      'reason',
      'description',
    ]);

  const select = [];

  if (patientIdColumn) {
    select.push(
      `${quoteIdentifier(
        patientIdColumn
      )} AS patient_id`
    );
  } else {
    select.push('NULL AS patient_id');
  }

  if (patientNameColumn) {
    select.push(
      `${quoteIdentifier(
        patientNameColumn
      )} AS patient_name`
    );
  } else {
    select.push(`'' AS patient_name`);
  }

  if (dateColumn) {
    select.push(
      `${quoteIdentifier(
        dateColumn
      )} AS letter_date`
    );
  } else {
    select.push(`NULL AS letter_date`);
  }

  if (referenceColumn) {
    select.push(
      `${quoteIdentifier(
        referenceColumn
      )} AS reference_number`
    );
  } else {
    select.push(`'' AS reference_number`);
  }

  if (purposeColumn) {
    select.push(
      `${quoteIdentifier(
        purposeColumn
      )} AS purpose`
    );
  } else {
    select.push(`'' AS purpose`);
  }

  let rows = [];

  try {
    rows = db.prepare(`
      SELECT ${select.join(', ')}
      FROM reference_letters
      ${hasColumn(
      'reference_letters',
      'hospital_id'
    )
        ? `WHERE hospital_id = ${HOSPITAL_ID}
             ${hasColumn(
          'reference_letters',
          'deleted_at'
        )
          ? 'AND deleted_at IS NULL'
          : ''
        }`
        : hasColumn(
          'reference_letters',
          'deleted_at'
        )
          ? 'WHERE deleted_at IS NULL'
          : ''
      }
      ORDER BY
        ${dateColumn
        ? quoteIdentifier(dateColumn)
        : 'rowid'
      } DESC
    `).all();
  } catch (error) {
    console.warn(
      '[EXPORT] Unable to read reference letters:',
      error.message
    );

    return [];
  }

  return rows.map((row) => ({
    referenceNumber:
      cleanText(row.reference_number),

    patient:
      cleanText(
        row.patient_name,
        row.patient_id
          ? patientName(row.patient_id)
          : '—'
      ),

    date:
      formatDate(row.letter_date),

    purpose:
      cleanText(row.purpose),
  }));
}

function countTable(tableName) {
  if (!tableExists(tableName)) {
    return 0;
  }

  const hasDeleted =
    hasColumn(tableName, 'deleted_at');

  const hasHospital =
    hasColumn(tableName, 'hospital_id');

  let where = '';

  if (hasHospital) {
    where = `WHERE hospital_id = ${HOSPITAL_ID}`;

    if (hasDeleted) {
      where += ` AND deleted_at IS NULL`;
    }
  } else if (hasDeleted) {
    where = `WHERE deleted_at IS NULL`;
  }

  try {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM ${quoteIdentifier(tableName)}
      ${where}
    `).get();

    return Number(row?.count || 0);
  } catch {
    return 0;
  }
}

function getSummary() {
  return {
    patients:
      countTable('patients'),

    families:
      countTable('families'),

    visits:
      countTable('visits'),

    prescriptions:
      countTable('medicines'),

    medicineCatalog:
      countTable('medicine_catalog'),

    illnessCertificates:
      countTable(
        'illness_certificates'
      ),

    fitnessCertificates:
      countTable(
        'fitness_certificates'
      ),

    cashReceipts:
      countTable('cash_receipts'),

    referenceLetters:
      countTable(
        'reference_letters'
      ),
  };
}

function safeFilePart(value) {
  return String(value || 'Clinic')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'Clinic';
}

function readableBackupDate(date = new Date()) {
  const pad = (value) =>
    String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') +
    '_' +
    [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('-');
}

function applicationTables() {
  return [
    'hospitals',
    'families',
    'patients',
    'visits',
    'medicines',
    'medicine_catalog',
    'presets',
    'fitness_certificates',
    'illness_certificates',
    'cash_receipts',
    'reference_letters',
    'form_definitions',
    'form_fields',
    'custom_field_values',
  ].filter(tableExists);
}

function internalColumn(column) {
  const name = String(column || '')
    .toLowerCase();

  return [
    'id',
    'sync_id',
    'hospital_id',
    'family_id',
    'patient_id',
    'visit_id',
    'family_sync_id',
    'patient_sync_id',
    'visit_sync_id',
    'updated_at',
    'deleted_at',
    'created_at',
  ].includes(name) ||
    name.endsWith('_sync_id');
}

function internalTable(tableName) {
  const name = String(tableName || '')
    .toLowerCase();

  return [
    'sync_queue',
    'sync_state',
    'sync_runtime',
    'device_identity',
    'app_settings',
  ].includes(name);
}
function getExportData() {
  return {
    summary: getSummary(),
    patients: getPatients(),
    families: getFamilies(),
    visits: getVisits(),
    prescriptions: getPrescriptions(),
    medicineCatalog: getMedicineCatalog(),
    illnessCertificates:
      getIllnessCertificates(),
    fitnessCertificates:
      getFitnessCertificates(),
    cashReceipts:
      getCashReceipts(),
    referenceLetters:
      getReferenceLetters(),
  };
}

/* =========================================================
   EXCEL EXPORT
   ========================================================= */

function applyExcelHeaderStyle(
  worksheet,
  rowNumber,
  columnCount
) {
  for (
    let column = 0;
    column < columnCount;
    column += 1
  ) {
    const cell =
      worksheet[
      XLSX.utils.encode_cell({
        r: rowNumber,
        c: column,
      })
      ];

    if (!cell) continue;

    cell.s = {
      font: {
        bold: true,
        color: {
          rgb: 'FFFFFF',
        },
      },

      fill: {
        fgColor: {
          rgb: '163A52',
        },
      },

      alignment: {
        vertical: 'center',
        horizontal: 'center',
        wrapText: true,
      },

      border: {
        top: {
          style: 'thin',
        },
        bottom: {
          style: 'thin',
        },
        left: {
          style: 'thin',
        },
        right: {
          style: 'thin',
        },
      },
    };
  }
}

function autoWidthExcelSheet(
  worksheet,
  rows,
  minimum = 12,
  maximum = 45
) {
  if (!rows.length) return;

  const keys =
    Object.keys(rows[0]);

  worksheet['!cols'] = keys.map(
    (key) => {
      let width =
        String(key).length + 2;

      for (const row of rows) {
        const value =
          row[key] === null ||
            row[key] === undefined
            ? ''
            : String(row[key]);

        const longestLine =
          value
            .split('\n')
            .reduce(
              (max, line) =>
                Math.max(
                  max,
                  line.length
                ),
              0
            );

        width = Math.max(
          width,
          longestLine + 2
        );
      }

      return {
        wch: Math.min(
          maximum,
          Math.max(
            minimum,
            width
          )
        ),
      };
    }
  );
}

function addExcelSheet(
  workbook,
  sheetName,
  rows
) {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const worksheet =
    XLSX.utils.json_to_sheet(
      safeRows
    );

  if (safeRows.length) {
    const columnCount =
      Object.keys(
        safeRows[0]
      ).length;

    applyExcelHeaderStyle(
      worksheet,
      0,
      columnCount
    );

    worksheet['!autofilter'] = {
      ref: worksheet['!ref'],
    };

    worksheet['!freeze'] = {
      xSplit: 0,
      ySplit: 1,
    };

    autoWidthExcelSheet(
      worksheet,
      safeRows
    );
  }

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName
  );

  return worksheet;
}

function createSummaryRows(
  data,
  clinic,
  generatedAt
) {
  return [
    {
      'Backup Information':
        'DOCTIFY OPD MANAGEMENT SYSTEM',
      Value: '',
    },

    {
      'Backup Information':
        'Clinic',
      Value: clinic,
    },

    {
      'Backup Information':
        'Generated At',
      Value: generatedAt,
    },

    {
      'Backup Information':
        'Patients',
      Value: data.summary.patients,
    },

    {
      'Backup Information':
        'Families',
      Value: data.summary.families,
    },

    {
      'Backup Information':
        'Visits',
      Value: data.summary.visits,
    },

    {
      'Backup Information':
        'Prescriptions',
      Value:
        data.summary.prescriptions,
    },

    {
      'Backup Information':
        'Medicine Catalog',
      Value:
        data.summary.medicineCatalog,
    },

    {
      'Backup Information':
        'Illness Certificates',
      Value:
        data.summary
          .illnessCertificates,
    },

    {
      'Backup Information':
        'Fitness Certificates',
      Value:
        data.summary
          .fitnessCertificates,
    },

    {
      'Backup Information':
        'Cash Receipts',
      Value:
        data.summary.cashReceipts,
    },

    {
      'Backup Information':
        'Reference Letters',
      Value:
        data.summary
          .referenceLetters,
    },
  ];
}

function patientExcelRows(
  patients
) {
  return patients.map(
    (patient) => ({
      'Patient Name':
        excelText(patient.name),

      Gender:
        excelText(patient.gender),

      Age:
        excelText(patient.age),

      Phone:
        excelText(patient.phone),

      Family:
        excelText(patient.family),
    })
  );
}

function familyExcelRows(
  families
) {
  return families.map(
    (family) => ({
      Family:
        excelText(family.family),

      'Members Count':
        excelText(family.count),

      Members:
        excelText(family.members),
    })
  );
}

function visitExcelRows(
  visits
) {
  return visits.map(
    (visit) => ({
      Patient:
        excelText(visit.patient),

      'Visit Date':
        excelText(visit.date),

      BP:
        excelText(visit.bp),

      Pulse:
        excelText(visit.pulse),

      SpO2:
        excelText(visit.spo2),

      Weight:
        excelText(visit.weight),

      Height:
        excelText(visit.height),

      Temperature:
        excelText(visit.temp),

      'Past History':
        excelText(
          visit.pastHistory
        ),

      Allergies:
        excelText(
          visit.allergies
        ),

      Complaints:
        excelText(
          visit.complaints
        ),

      'On Examination':
        excelText(visit.oe),

      'Quick Note':
        excelText(
          visit.quickNote
        ),

      Diagnosis:
        excelText(
          visit.diagnosis
        ),

      Suggestions:
        excelText(
          visit.suggestions
        ),

      Investigations:
        excelText(
          visit.investigations
        ),

      'OPD Medicine':
        excelText(
          visit.opdMedicine
        ),

      'Follow Up':
        excelText(
          visit.followUp
        ),
    })
  );
}

function prescriptionExcelRows(
  prescriptions
) {
  return prescriptions.map(
    (medicine) => ({
      Patient:
        excelText(
          medicine.patient
        ),

      'Visit Date':
        excelText(
          medicine.date
        ),

      Type:
        excelText(
          medicine.type
        ),

      Medicine:
        excelText(
          medicine.medicine
        ),

      Language:
        excelText(
          medicine.language
        ),

      Dosage:
        excelText(
          medicine.dosage
        ),

      'Food Timing':
        excelText(
          medicine.timing
        ),

      Quantity:
        excelText(
          medicine.quantity
        ),

      Instructions:
        excelText(
          medicine.instructions
        ),
    })
  );
}

function medicineCatalogExcelRows(
  medicines
) {
  return medicines.map(
    (medicine) => ({
      Medicine:
        excelText(medicine.name),

      Type:
        excelText(medicine.type),
    })
  );
}

function illnessExcelRows(
  certificates
) {
  return certificates.map(
    (certificate) => ({
      Patient:
        excelText(
          certificate.patient
        ),

      'Examination Date':
        excelText(
          certificate.examinationDate
        ),

      Age:
        excelText(
          certificate.age
        ),

      Gender:
        excelText(
          certificate.gender
        ),

      Diagnosis:
        excelText(
          certificate.diagnosis
        ),

      'Start Date':
        excelText(
          certificate.startDate
        ),

      'End Date':
        excelText(
          certificate.endDate
        ),

      'Resume Date':
        excelText(
          certificate.resumeDate
        ),
    })
  );
}

function fitnessExcelRows(
  certificates
) {
  return certificates.map(
    (certificate) => ({
      Patient:
        excelText(
          certificate.patient
        ),

      'Examination Date':
        excelText(
          certificate.examinationDate
        ),

      Age:
        excelText(
          certificate.age
        ),

      Gender:
        excelText(
          certificate.gender
        ),

      'Fit From':
        excelText(
          certificate.fitFrom
        ),

      'Fit Until':
        excelText(
          certificate.fitUntil
        ),

      Purpose:
        excelText(
          certificate.purpose
        ),
    })
  );
}

function receiptExcelRows(
  receipts
) {
  return receipts.map(
    (receipt) => ({
      'Receipt Number':
        excelText(
          receipt.receiptNumber
        ),

      Patient:
        excelText(
          receipt.patient
        ),

      Date:
        excelText(
          receipt.date
        ),

      Amount:
        excelText(
          receipt.amount
        ),

      'Payment Mode':
        excelText(
          receipt.paymentMode
        ),

      Description:
        excelText(
          receipt.description
        ),
    })
  );
}

function referenceExcelRows(
  references
) {
  return references.map(
    (reference) => ({
      'Reference Number':
        excelText(
          reference.referenceNumber
        ),

      Patient:
        excelText(
          reference.patient
        ),

      Date:
        excelText(
          reference.date
        ),

      Purpose:
        excelText(
          reference.purpose
        ),
    })
  );
}
function createExcelExport(
  data,
  outputPath,
  clinic,
  generatedAt
) {
  console.log('🟢🟢🟢 createExcelExport CALLED, writing to:', outputPath);
  /*
   * Compatibility:
   *
   * backup.js in the existing Doctify backend passes the
   * export collections directly in some cases, while the
   * newer exporter expects:
   *
   * {
   *   summary,
   *   patients,
   *   families,
   *   visits,
   *   prescriptions,
   *   ...
   * }
   *
   * Normalize both forms here so backup.js does not need
   * to be changed.
   */

  if (!data || typeof data !== 'object') {
    data = {};
  }

  const normalizedData = {
    summary:
      data.summary ||
      getSummary(),

    patients:
      Array.isArray(data.patients)
        ? data.patients
        : getPatients(),

    families:
      Array.isArray(data.families)
        ? data.families
        : getFamilies(),

    visits:
      Array.isArray(data.visits)
        ? data.visits
        : getVisits(),

    prescriptions:
      Array.isArray(data.prescriptions)
        ? data.prescriptions
        : getPrescriptions(),

    medicineCatalog:
      Array.isArray(
        data.medicineCatalog
      )
        ? data.medicineCatalog
        : getMedicineCatalog(),

    illnessCertificates:
      Array.isArray(
        data.illnessCertificates
      )
        ? data.illnessCertificates
        : getIllnessCertificates(),

    fitnessCertificates:
      Array.isArray(
        data.fitnessCertificates
      )
        ? data.fitnessCertificates
        : getFitnessCertificates(),

    cashReceipts:
      Array.isArray(
        data.cashReceipts
      )
        ? data.cashReceipts
        : getCashReceipts(),

    referenceLetters:
      Array.isArray(
        data.referenceLetters
      )
        ? data.referenceLetters
        : getReferenceLetters(),
  };

  const workbook =
    XLSX.utils.book_new();

  addExcelSheet(
    workbook,
    'Backup Summary',
    createSummaryRows(
      normalizedData,
      clinic,
      generatedAt
    )
  );

  addExcelSheet(
    workbook,
    'Patients',
    patientExcelRows(
      normalizedData.patients
    )
  );

  addExcelSheet(
    workbook,
    'Families',
    familyExcelRows(
      normalizedData.families
    )
  );

  addExcelSheet(
    workbook,
    'Visits',
    visitExcelRows(
      normalizedData.visits
    )
  );

  addExcelSheet(
    workbook,
    'Prescriptions',
    prescriptionExcelRows(
      normalizedData.prescriptions
    )
  );

  addExcelSheet(
    workbook,
    'Medicine Catalog',
    medicineCatalogExcelRows(
      normalizedData.medicineCatalog
    )
  );

  addExcelSheet(
    workbook,
    'Illness Certificates',
    illnessExcelRows(
      normalizedData.illnessCertificates
    )
  );

  addExcelSheet(
    workbook,
    'Fitness Certificates',
    fitnessExcelRows(
      normalizedData.fitnessCertificates
    )
  );

  addExcelSheet(
    workbook,
    'Cash Receipts',
    receiptExcelRows(
      normalizedData.cashReceipts
    )
  );

  addExcelSheet(
    workbook,
    'Reference Letters',
    referenceExcelRows(
      normalizedData.referenceLetters
    )
  );

  XLSX.writeFile(
    workbook,
    outputPath
  );

  return outputPath;
}

/* =========================================================
   PDF EXPORT
   ========================================================= */

function findDevanagariFont() {
  const candidates = [
    'C:\\Windows\\Fonts\\NotoSansDevanagari-Regular.ttf',
    'C:\\Windows\\Fonts\\NotoSansDevanagari[wght].ttf',
    'C:\\Windows\\Fonts\\NotoSansDevanagari-VariableFont_wdth,wght.ttf',
    'C:\\Windows\\Fonts\\Mangal.ttf',

    '/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansDevanagari-Regular.ttf',
    '/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf',

    path.join(
      __dirname,
      '../../fonts/NotoSansDevanagari-Regular.ttf'
    ),

    path.join(
      __dirname,
      '../../fonts/NotoSansDevanagari.ttf'
    ),
  ];

  return (
    candidates.find((fontPath) =>
      fs.existsSync(fontPath)
    ) || null
  );
}

function containsDevanagari(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  return /[\u0900-\u097F]/.test(
    String(value)
  );
}

function containsNonLatin(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  return /[^\x00-\x7F]/.test(
    String(value)
  );
}

function registerPdfFonts(doc) {
  const devanagariFont =
    findDevanagariFont();

  if (devanagariFont) {
    try {
      doc.registerFont(
        'DoctifyDevanagari',
        devanagariFont
      );

      return true;
    } catch (error) {
      console.warn(
        '[EXPORT] Could not register Devanagari font:',
        error.message
      );
    }
  }

  return false;
}

function pdfText(doc, value) {
  return cleanText(value, '—');
}

function usePdfFont(
  doc,
  devanagariAvailable,
  value
) {
  if (
    devanagariAvailable &&
    containsNonLatin(value)
  ) {
    doc.font('DoctifyDevanagari');
  } else {
    doc.font('Helvetica');
  }
}

function pdfPageWidth(doc) {
  return (
    doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right
  );
}

function pdfPageHeight(doc) {
  return (
    doc.page.height -
    doc.page.margins.top -
    doc.page.margins.bottom
  );
}

function addPdfFooter(
  doc,
  devanagariAvailable
) {
  const range =
    doc.bufferedPageRange();

  const start =
    range.start;

  const count =
    range.count;

  for (
    let pageIndex = start;
    pageIndex < start + count;
    pageIndex += 1
  ) {
    doc.switchToPage(
      pageIndex
    );

    doc.save();

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#71808C')
      .text(
        `Doctify OPD Management System   •   Page ${pageIndex - start + 1
        } of ${count}`,
        doc.page.margins.left,
        doc.page.height - 32,
        {
          width: pdfPageWidth(doc),
          align: 'center',
          lineBreak: false,
        }
      );

    doc.restore();
  }
}

function pdfSectionTitle(
  doc,
  title,
  devanagariAvailable
) {
  const width =
    pdfPageWidth(doc);

  const y = doc.y;

  doc.save();

  doc
    .roundedRect(
      doc.page.margins.left,
      y,
      width,
      34,
      8
    )
    .fill('#EAF2F7');

  usePdfFont(
    doc,
    devanagariAvailable,
    title
  );

  doc
    .fontSize(14)
    .fillColor('#163A52')
    .font(
      devanagariAvailable &&
        containsNonLatin(title)
        ? 'DoctifyDevanagari'
        : 'Helvetica-Bold'
    )
    .text(
      title,
      doc.page.margins.left + 12,
      y + 9,
      {
        width: width - 24,
        lineBreak: false,
      }
    );

  doc.restore();

  doc.y = y + 46;
}

function ensurePdfRoom(
  doc,
  requiredHeight = 80
) {
  const bottom =
    doc.page.height -
    doc.page.margins.bottom;

  if (
    doc.y + requiredHeight >
    bottom
  ) {
    doc.addPage();
    return true;
  }

  return false;
}

function drawKeyValue(
  doc,
  label,
  value,
  options = {}
) {
  const labelWidth =
    options.labelWidth || 105;

  const valueWidth =
    options.valueWidth ||
    pdfPageWidth(doc) -
    labelWidth;

  const fontSize =
    options.fontSize || 9.5;

  const devanagariAvailable =
    options.devanagariAvailable ||
    false;

  const x =
    doc.page.margins.left;

  const y =
    doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(fontSize)
    .fillColor('#465968')
    .text(
      label,
      x,
      y,
      {
        width: labelWidth,
        continued: false,
      }
    );

  usePdfFont(
    doc,
    devanagariAvailable,
    value
  );

  doc
    .fontSize(fontSize)
    .fillColor('#1D2E3A')
    .text(
      pdfText(doc, value),
      x + labelWidth,
      y,
      {
        width: valueWidth - 8,
      }
    );

  doc.y =
    Math.max(
      doc.y,
      y + 15
    ) + 4;
}

function drawPdfTable(
  doc,
  columns,
  rows,
  options = {}
) {
  const devanagariAvailable =
    options.devanagariAvailable ||
    false;

  const fontSize =
    options.fontSize || 8;

  const headerFontSize =
    options.headerFontSize || 8;

  const rowPadding =
    options.rowPadding || 5;

  const totalWidth =
    options.width ||
    pdfPageWidth(doc);

  const widths =
    columns.map(
      (column) =>
        totalWidth *
        Number(column.width)
    );

  const drawHeader =
    (y) => {
      let x =
        doc.page.margins.left;

      doc.save();

      doc
        .rect(
          x,
          y,
          totalWidth,
          25
        )
        .fill('#163A52');

      columns.forEach(
        (column, index) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(
              headerFontSize
            )
            .fillColor('#FFFFFF')
            .text(
              column.label,
              x + 5,
              y + 7,
              {
                width:
                  widths[index] - 10,
                align:
                  column.align ||
                  'left',
                lineBreak: false,
              }
            );

          x += widths[index];
        }
      );

      doc.restore();

      return y + 25;
    };

  let y = doc.y;

  if (!rows.length) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#71808C')
      .text(
        'No records available.',
        doc.page.margins.left,
        y
      );

    doc.y = y + 24;

    return;
  }

  y = drawHeader(y);

  rows.forEach(
    (row, rowIndex) => {
      const cellTexts =
        columns.map(
          (column) =>
            pdfText(
              doc,
              row[column.key]
            )
        );

      const heights =
        columns.map(
          (column, index) =>
            doc.heightOfString(
              cellTexts[index],
              {
                width:
                  widths[index] -
                  10,
                fontSize,
              }
            )
        );

      const rowHeight =
        Math.max(
          25,
          ...heights
        ) +
        rowPadding * 2;

      const bottom =
        doc.page.height -
        doc.page.margins.bottom -
        20;

      if (
        y + rowHeight >
        bottom
      ) {
        doc.addPage();

        y =
          doc.page.margins.top;

        y = drawHeader(y);
      }

      if (
        rowIndex % 2 === 0
      ) {
        doc
          .save()
          .rect(
            doc.page.margins.left,
            y,
            totalWidth,
            rowHeight
          )
          .fill('#F7FAFC')
          .restore();
      }

      let x =
        doc.page.margins.left;

      columns.forEach(
        (column, index) => {
          const value =
            cellTexts[index];

          usePdfFont(
            doc,
            devanagariAvailable,
            value
          );

          doc
            .fontSize(fontSize)
            .fillColor('#263B49')
            .text(
              value,
              x + 5,
              y + rowPadding,
              {
                width:
                  widths[index] -
                  10,
                align:
                  column.align ||
                  'left',
              }
            );

          x += widths[index];
        }
      );

      doc
        .save()
        .strokeColor('#DCE5EB')
        .lineWidth(0.5)
        .moveTo(
          doc.page.margins.left,
          y + rowHeight
        )
        .lineTo(
          doc.page.margins.left +
          totalWidth,
          y + rowHeight
        )
        .stroke()
        .restore();

      y += rowHeight;
    }
  );

  doc.y = y + 12;
}
function drawInfoCard(
  doc,
  title,
  items,
  options = {}
) {
  const devanagariAvailable =
    options.devanagariAvailable ||
    false;

  const width =
    pdfPageWidth(doc);

  const x =
    doc.page.margins.left;

  const padding = 12;

  const startY =
    doc.y;

  const rows =
    Array.isArray(items)
      ? items
      : [];

  let contentHeight = 0;

  for (const item of rows) {
    const value =
      item.value === null ||
        item.value === undefined
        ? '—'
        : String(item.value);

    const valueHeight =
      doc.heightOfString(
        value,
        {
          width:
            width -
            150,
          fontSize:
            item.fontSize || 9.5,
        }
      );

    contentHeight +=
      Math.max(
        18,
        valueHeight
      ) + 4;
  }

  const cardHeight =
    42 +
    contentHeight +
    padding;

  const bottom =
    doc.page.height -
    doc.page.margins.bottom;

  if (
    startY + cardHeight >
    bottom
  ) {
    doc.addPage();
  }

  const y =
    doc.y;

  doc.save();

  doc
    .roundedRect(
      x,
      y,
      width,
      cardHeight,
      8
    )
    .fill('#FFFFFF')
    .strokeColor('#DCE5EB')
    .lineWidth(0.8)
    .stroke();

  doc.restore();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#163A52')
    .text(
      title,
      x + padding,
      y + 12,
      {
        width:
          width -
          padding * 2,
        lineBreak: false,
      }
    );

  let currentY =
    y + 39;

  rows.forEach((item) => {
    const label =
      cleanText(
        item.label,
        ''
      );

    const value =
      item.value === null ||
        item.value === undefined ||
        String(item.value).trim() === ''
        ? '—'
        : String(item.value);

    doc
      .font('Helvetica-Bold')
      .fontSize(
        item.fontSize || 9.5
      )
      .fillColor('#657684')
      .text(
        label,
        x + padding,
        currentY,
        {
          width: 125,
        }
      );

    usePdfFont(
      doc,
      devanagariAvailable,
      value
    );

    const valueHeight =
      doc.heightOfString(
        value,
        {
          width:
            width -
            150,
          fontSize:
            item.fontSize || 9.5,
        }
      );

    doc
      .fontSize(
        item.fontSize || 9.5
      )
      .fillColor('#253A47')
      .text(
        value,
        x + 140,
        currentY,
        {
          width:
            width -
            152,
        }
      );

    currentY +=
      Math.max(
        18,
        valueHeight
      ) + 4;
  });

  doc.y =
    y + cardHeight + 12;
}

function drawVisitCard(
  doc,
  visit,
  prescriptions,
  options = {}
) {
  const devanagariAvailable =
    options.devanagariAvailable ||
    false;

  const x =
    doc.page.margins.left;

  const width =
    pdfPageWidth(doc);

  /*
   * Visit heading
   */
  ensurePdfRoom(
    doc,
    90
  );

  const startY =
    doc.y;

  doc.save();

  doc
    .roundedRect(
      x,
      startY,
      width,
      46,
      8
    )
    .fill('#163A52');

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#FFFFFF')
    .text(
      visit.patient,
      x + 12,
      startY + 9,
      {
        width:
          width * 0.65,
        lineBreak: false,
      }
    );

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#DCEAF2')
    .text(
      visit.date,
      x + width * 0.65,
      startY + 11,
      {
        width:
          width * 0.35 - 12,
        align: 'right',
        lineBreak: false,
      }
    );

  doc.restore();

  doc.y =
    startY + 58;

  /*
   * Vitals
   */
  const vitals = [
    {
      label: 'BP',
      value: visit.bp,
    },

    {
      label: 'Pulse',
      value: visit.pulse,
    },

    {
      label: 'SpO₂',
      value: visit.spo2,
    },

    {
      label: 'Weight',
      value: visit.weight,
    },

    {
      label: 'Height',
      value: visit.height,
    },

    {
      label: 'Temperature',
      value: visit.temp,
    },
  ];

  const visibleVitals =
    vitals.filter(
      (item) =>
        item.value &&
        item.value !== '—'
    );

  if (visibleVitals.length) {
    const boxWidth =
      width /
      Math.min(
        visibleVitals.length,
        3
      );

    const columns =
      Math.min(
        visibleVitals.length,
        3
      );

    const rows =
      Math.ceil(
        visibleVitals.length /
        columns
      );

    const boxHeight =
      46;

    for (
      let row = 0;
      row < rows;
      row += 1
    ) {
      const rowItems =
        visibleVitals.slice(
          row * columns,
          row * columns + columns
        );

      const y =
        doc.y;

      rowItems.forEach(
        (item, index) => {
          const itemX =
            x +
            index * boxWidth;

          doc
            .roundedRect(
              itemX + 3,
              y,
              boxWidth - 6,
              boxHeight,
              6
            )
            .fill('#F4F8FA')
            .strokeColor('#E0E8ED')
            .lineWidth(0.6)
            .stroke();

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#71808C')
            .text(
              item.label,
              itemX + 8,
              y + 8,
              {
                width:
                  boxWidth - 16,
                lineBreak: false,
              }
            );

          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#1E3748')
            .text(
              String(item.value),
              itemX + 8,
              y + 23,
              {
                width:
                  boxWidth - 16,
                lineBreak: false,
              }
            );
        }
      );

      doc.y =
        y + boxHeight + 7;
    }
  }

  /*
   * Clinical information
   */
  const clinicalSections = [
    [
      'Complaints',
      visit.complaints,
    ],

    [
      'Past History',
      visit.pastHistory,
    ],

    [
      'Allergies',
      visit.allergies,
    ],

    [
      'On Examination',
      visit.oe,
    ],

    [
      'Quick Note',
      visit.quickNote,
    ],

    [
      'Diagnosis',
      visit.diagnosis,
    ],

    [
      'Investigations',
      visit.investigations,
    ],

    [
      'Suggestions',
      visit.suggestions,
    ],

    [
      'OPD Medicine',
      visit.opdMedicine,
    ],

    [
      'Follow Up',
      visit.followUp,
    ],
  ];

  for (
    const [label, value] of clinicalSections
  ) {
    if (
      !value ||
      value === '—'
    ) {
      continue;
    }

    const text =
      String(value);

    const estimatedHeight =
      doc.heightOfString(
        text,
        {
          width:
            width - 30,
          fontSize: 9.5,
        }
      ) + 38;

    ensurePdfRoom(
      doc,
      estimatedHeight
    );

    const sectionY =
      doc.y;

    doc.save();

    doc
      .roundedRect(
        x,
        sectionY,
        width,
        estimatedHeight,
        6
      )
      .fill('#FBFCFD')
      .strokeColor('#E2E9EE')
      .lineWidth(0.6)
      .stroke();

    doc.restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#506473')
      .text(
        label,
        x + 10,
        sectionY + 9,
        {
          width:
            width - 20,
          lineBreak: false,
        }
      );

    usePdfFont(
      doc,
      devanagariAvailable,
      text
    );

    doc
      .fontSize(9.5)
      .fillColor('#263B49')
      .text(
        text,
        x + 10,
        sectionY + 23,
        {
          width:
            width - 20,
        }
      );

    doc.y =
      sectionY +
      estimatedHeight +
      8;
  }

  /*
   * Prescription section.
   *
   * Instead of a huge wide table, each medicine gets
   * a compact readable card.
   */
  const visitPrescriptions =
    prescriptions.filter(
      (medicine) =>
        medicine.patient ===
        visit.patient &&
        medicine.date ===
        visit.date
    );

  if (
    visitPrescriptions.length
  ) {
    ensurePdfRoom(
      doc,
      55
    );

    pdfSectionTitle(
      doc,
      'Prescription',
      devanagariAvailable
    );

    visitPrescriptions.forEach(
      (medicine, index) => {
        const medicineName =
          medicine.medicine;

        const details = [
          medicine.type !== '—'
            ? medicine.type
            : '',

          medicine.dosage !== '—'
            ? medicine.dosage
            : '',

          medicine.timing !== '—'
            ? medicine.timing
            : '',

          medicine.quantity !== '—'
            ? `Qty: ${medicine.quantity}`
            : '',
        ].filter(Boolean);

        const instruction =
          medicine.instructions !== '—'
            ? medicine.instructions
            : '';

        const estimatedHeight =
          42 +
          (instruction
            ? doc.heightOfString(
              instruction,
              {
                width:
                  width - 30,
                fontSize: 9,
              }
            )
            : 0);

        ensurePdfRoom(
          doc,
          estimatedHeight
        );

        const y =
          doc.y;

        doc.save();

        doc
          .roundedRect(
            x,
            y,
            width,
            estimatedHeight,
            7
          )
          .fill(
            index % 2 === 0
              ? '#F7FAFC'
              : '#FFFFFF'
          )
          .strokeColor('#DEE7EC')
          .lineWidth(0.6)
          .stroke();

        doc.restore();

        usePdfFont(
          doc,
          devanagariAvailable,
          medicineName
        );

        doc
          .fontSize(10.5)
          .fillColor('#173B52')
          .font(
            containsNonLatin(
              medicineName
            ) &&
              devanagariAvailable
              ? 'DoctifyDevanagari'
              : 'Helvetica-Bold'
          )
          .text(
            medicineName,
            x + 10,
            y + 9,
            {
              width:
                width - 20,
              lineBreak: false,
            }
          );

        if (details.length) {
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor('#637582')
            .text(
              details.join('   •   '),
              x + 10,
              y + 25,
              {
                width:
                  width - 20,
                lineBreak: false,
              }
            );
        }

        if (instruction) {
          usePdfFont(
            doc,
            devanagariAvailable,
            instruction
          );

          doc
            .fontSize(9)
            .fillColor('#304652')
            .text(
              instruction,
              x + 10,
              y + 40,
              {
                width:
                  width - 20,
              }
            );
        }

        doc.y =
          y +
          estimatedHeight +
          7;
      }
    );
  }

  /*
   * Follow-up separator
   */
  doc.moveDown(0.4);

  doc
    .strokeColor('#DDE6EB')
    .lineWidth(0.7)
    .moveTo(
      x,
      doc.y
    )
    .lineTo(
      x + width,
      doc.y
    )
    .stroke();

  doc.y += 12;
}

function drawPatientDirectory(
  doc,
  patients,
  devanagariAvailable
) {
  pdfSectionTitle(
    doc,
    'Patient Directory',
    devanagariAvailable
  );

  drawPdfTable(
    doc,
    [
      {
        key: 'name',
        label: 'Patient',
        width: 0.28,
      },

      {
        key: 'gender',
        label: 'Gender',
        width: 0.13,
      },

      {
        key: 'age',
        label: 'Age',
        width: 0.10,
        align: 'center',
      },

      {
        key: 'phone',
        label: 'Phone',
        width: 0.20,
      },

      {
        key: 'family',
        label: 'Family',
        width: 0.29,
      },
    ],
    patients,
    {
      devanagariAvailable,
      fontSize: 8.5,
      headerFontSize: 8.5,
    }
  );
}

function drawFamilyDirectory(
  doc,
  families,
  devanagariAvailable
) {
  pdfSectionTitle(
    doc,
    'Family Directory',
    devanagariAvailable
  );

  drawPdfTable(
    doc,
    [
      {
        key: 'family',
        label: 'Family',
        width: 0.30,
      },

      {
        key: 'count',
        label: 'Members',
        width: 0.15,
        align: 'center',
      },

      {
        key: 'members',
        label: 'Active Members',
        width: 0.55,
      },
    ],
    families,
    {
      devanagariAvailable,
      fontSize: 8.5,
      headerFontSize: 8.5,
    }
  );
}

function drawPrescriptionDirectory(
  doc,
  prescriptions,
  devanagariAvailable
) {
  pdfSectionTitle(
    doc,
    'Prescription Summary',
    devanagariAvailable
  );

  drawPdfTable(
    doc,
    [
      {
        key: 'patient',
        label: 'Patient',
        width: 0.23,
      },

      {
        key: 'date',
        label: 'Date',
        width: 0.15,
      },

      {
        key: 'medicine',
        label: 'Medicine',
        width: 0.23,
      },

      {
        key: 'dosage',
        label: 'Dosage',
        width: 0.19,
      },

      {
        key: 'timing',
        label: 'Timing',
        width: 0.20,
      },
    ],
    prescriptions,
    {
      devanagariAvailable,
      fontSize: 7.8,
      headerFontSize: 8,
    }
  );
}

function drawMedicineCatalog(
  doc,
  medicines,
  devanagariAvailable
) {
  pdfSectionTitle(
    doc,
    'Medicine Catalog',
    devanagariAvailable
  );

  drawPdfTable(
    doc,
    [
      {
        key: 'name',
        label: 'Medicine',
        width: 0.65,
      },

      {
        key: 'type',
        label: 'Type',
        width: 0.35,
      },
    ],
    medicines,
    {
      devanagariAvailable,
      fontSize: 9,
      headerFontSize: 9,
    }
  );
}

function drawCertificateTables(
  doc,
  data,
  devanagariAvailable
) {
  if (
    data.illnessCertificates.length
  ) {
    pdfSectionTitle(
      doc,
      'Illness Certificates',
      devanagariAvailable
    );

    drawPdfTable(
      doc,
      [
        {
          key: 'patient',
          label: 'Patient',
          width: 0.25,
        },

        {
          key: 'examinationDate',
          label: 'Exam Date',
          width: 0.16,
        },

        {
          key: 'diagnosis',
          label: 'Diagnosis',
          width: 0.27,
        },

        {
          key: 'startDate',
          label: 'From',
          width: 0.16,
        },

        {
          key: 'endDate',
          label: 'To',
          width: 0.16,
        },
      ],
      data.illnessCertificates,
      {
        devanagariAvailable,
        fontSize: 7.8,
        headerFontSize: 8,
      }
    );
  }

  if (
    data.fitnessCertificates.length
  ) {
    ensurePdfRoom(
      doc,
      70
    );

    pdfSectionTitle(
      doc,
      'Fitness Certificates',
      devanagariAvailable
    );

    drawPdfTable(
      doc,
      [
        {
          key: 'patient',
          label: 'Patient',
          width: 0.27,
        },

        {
          key: 'examinationDate',
          label: 'Exam Date',
          width: 0.18,
        },

        {
          key: 'fitFrom',
          label: 'Fit From',
          width: 0.18,
        },

        {
          key: 'fitUntil',
          label: 'Fit Until',
          width: 0.18,
        },

        {
          key: 'purpose',
          label: 'Purpose',
          width: 0.19,
        },
      ],
      data.fitnessCertificates,
      {
        devanagariAvailable,
        fontSize: 7.8,
        headerFontSize: 8,
      }
    );
  }
}

function drawFinancialTables(
  doc,
  data,
  devanagariAvailable
) {
  if (
    data.cashReceipts.length
  ) {
    pdfSectionTitle(
      doc,
      'Cash Receipts',
      devanagariAvailable
    );

    drawPdfTable(
      doc,
      [
        {
          key: 'receiptNumber',
          label: 'Receipt',
          width: 0.18,
        },

        {
          key: 'patient',
          label: 'Patient',
          width: 0.24,
        },

        {
          key: 'date',
          label: 'Date',
          width: 0.15,
        },

        {
          key: 'amount',
          label: 'Amount',
          width: 0.14,
          align: 'right',
        },

        {
          key: 'paymentMode',
          label: 'Mode',
          width: 0.14,
        },

        {
          key: 'description',
          label: 'Description',
          width: 0.15,
        },
      ],
      data.cashReceipts,
      {
        devanagariAvailable,
        fontSize: 7.5,
        headerFontSize: 7.8,
      }
    );
  }

  if (
    data.referenceLetters.length
  ) {
    ensurePdfRoom(
      doc,
      70
    );

    pdfSectionTitle(
      doc,
      'Reference Letters',
      devanagariAvailable
    );

    drawPdfTable(
      doc,
      [
        {
          key: 'referenceNumber',
          label: 'Reference',
          width: 0.22,
        },

        {
          key: 'patient',
          label: 'Patient',
          width: 0.27,
        },

        {
          key: 'date',
          label: 'Date',
          width: 0.17,
        },

        {
          key: 'purpose',
          label: 'Purpose',
          width: 0.34,
        },
      ],
      data.referenceLetters,
      {
        devanagariAvailable,
        fontSize: 8,
        headerFontSize: 8,
      }
    );
  }
  }
  function createPdfExport(
    data,
    outputPath,
    clinic,
    generatedAt
  ) {
    /*
     * Compatibility with the existing backup service.
     *
     * New signature:
     *   createPdfExport(data, outputPath, clinic, generatedAt)
     *
     * Older backup.js may call:
     *   createPdfExport(outputPath, options)
     * or:
     *   createPdfExport(tables, outputPath, clinic, generatedAt)
     */

    if (typeof data === 'string') {
      const legacyOutputPath = data;

      const options =
        outputPath &&
          typeof outputPath === 'object' &&
          !Array.isArray(outputPath)
          ? outputPath
          : {};

      data =
        options.data ||
        getExportData();

      outputPath =
        legacyOutputPath;

      clinic =
        options.clinicName ||
        clinic ||
        clinicName();

      generatedAt =
        options.generatedAt ||
        generatedAt ||
        new Date().toLocaleString('en-IN');
    } else if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      data = getExportData();

      clinic =
        clinic ||
        clinicName();

      generatedAt =
        generatedAt ||
        new Date().toLocaleString('en-IN');
    } else {
      clinic =
        clinic ||
        clinicName();

      generatedAt =
        generatedAt ||
        new Date().toLocaleString('en-IN');
    }
    return new Promise(
      (resolve, reject) => {
        const doc =
          new PDFDocument({
            size: 'A4',
            margins: {
              top: 45,
              bottom: 45,
              left: 45,
              right: 45,
            },

            /*
             * Required because page numbers are added
             * after all pages have been generated.
             */
            bufferPages: true,

            info: {
              Title:
                `Doctify OPD Backup - ${clinic}`,

              Author:
                'Doctify OPD Management System',

              Subject:
                'Human-readable clinic data backup',

              Creator:
                'Doctify',
            },
          });

        const stream =
          fs.createWriteStream(
            outputPath
          );

        let settled = false;

        const finish = () => {
          if (settled) return;

          settled = true;

          resolve(outputPath);
        };

        const fail = (error) => {
          if (settled) return;

          settled = true;

          reject(error);
        };

        stream.on(
          'finish',
          finish
        );

        stream.on(
          'error',
          fail
        );

        doc.on(
          'error',
          fail
        );

        doc.pipe(stream);

        const devanagariAvailable =
          registerPdfFonts(doc);

        /*
         * -----------------------------------------------------
         * COVER PAGE
         * -----------------------------------------------------
         */

        doc
          .font('Helvetica-Bold')
          .fontSize(26)
          .fillColor('#163A52')
          .text(
            'DOCTIFY',
            {
              align: 'center',
            }
          );

        doc.moveDown(0.4);

        doc
          .font('Helvetica')
          .fontSize(14)
          .fillColor('#637582')
          .text(
            'OPD MANAGEMENT SYSTEM',
            {
              align: 'center',
            }
          );

        doc.moveDown(2);

        doc
          .roundedRect(
            65,
            doc.y,
            doc.page.width - 130,
            125,
            14
          )
          .fill('#EAF2F7');

        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor('#163A52')
          .text(
            'Clinic Data Backup',
            85,
            doc.y + 30,
            {
              width:
                doc.page.width - 170,
              align: 'center',
            }
          );

        doc
          .font('Helvetica')
          .fontSize(12)
          .fillColor('#4F6371')
          .text(
            clinic,
            85,
            doc.y + 20,
            {
              width:
                doc.page.width - 170,
              align: 'center',
            }
          );

        doc.y += 170;

        drawInfoCard(
          doc,
          'Backup Information',
          [
            {
              label: 'Clinic',
              value: clinic,
            },

            {
              label: 'Generated',
              value: generatedAt,
            },

            {
              label: 'Patients',
              value:
                data.summary.patients,
            },

            {
              label: 'Families',
              value:
                data.summary.families,
            },

            {
              label: 'Visits',
              value:
                data.summary.visits,
            },

            {
              label: 'Prescriptions',
              value:
                data.summary
                  .prescriptions,
            },

            {
              label: 'Medicine Catalog',
              value:
                data.summary
                  .medicineCatalog,
            },

            {
              label:
                'Illness Certificates',
              value:
                data.summary
                  .illnessCertificates,
            },

            {
              label:
                'Fitness Certificates',
              value:
                data.summary
                  .fitnessCertificates,
            },

            {
              label:
                'Cash Receipts',
              value:
                data.summary
                  .cashReceipts,
            },

            {
              label:
                'Reference Letters',
              value:
                data.summary
                  .referenceLetters,
            },
          ],
          {
            devanagariAvailable,
          }
        );

        ensurePdfRoom(
          doc,
          100
        );

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#71808C')
          .text(
            'The accompanying SQLite database file is the authoritative restore backup. This PDF is a human-readable clinic report.',
            {
              align: 'center',
              width:
                pdfPageWidth(doc),
            }
          );

        /*
         * -----------------------------------------------------
         * PATIENT DIRECTORY
         * -----------------------------------------------------
         */

        doc.addPage();

        drawPatientDirectory(
          doc,
          data.patients,
          devanagariAvailable
        );

        /*
         * -----------------------------------------------------
         * FAMILY DIRECTORY
         * -----------------------------------------------------
         */

        doc.addPage();

        drawFamilyDirectory(
          doc,
          data.families,
          devanagariAvailable
        );

        /*
         * -----------------------------------------------------
         * VISIT HISTORY
         * -----------------------------------------------------
         */

        doc.addPage();

        pdfSectionTitle(
          doc,
          'Visit History',
          devanagariAvailable
        );

        if (!data.visits.length) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#71808C')
            .text(
              'No visit records available.'
            );
        } else {
          data.visits.forEach(
            (visit) => {
              drawVisitCard(
                doc,
                visit,
                data.prescriptions,
                {
                  devanagariAvailable,
                }
              );
            }
          );
        }

        /*
         * -----------------------------------------------------
         * PRESCRIPTION DIRECTORY
         * -----------------------------------------------------
         */

        if (
          data.prescriptions.length
        ) {
          doc.addPage();

          drawPrescriptionDirectory(
            doc,
            data.prescriptions,
            devanagariAvailable
          );
        }

        /*
         * -----------------------------------------------------
         * MEDICINE CATALOG
         * -----------------------------------------------------
         */

        if (
          data.medicineCatalog.length
        ) {
          doc.addPage();

          drawMedicineCatalog(
            doc,
            data.medicineCatalog,
            devanagariAvailable
          );
        }

        /*
         * -----------------------------------------------------
         * CERTIFICATES
         * -----------------------------------------------------
         */

        if (
          data.illnessCertificates
            .length ||
          data.fitnessCertificates
            .length
        ) {
          doc.addPage();

          drawCertificateTables(
            doc,
            data,
            devanagariAvailable
          );
        }

        /*
         * -----------------------------------------------------
         * FINANCIAL + REFERENCE DATA
         * -----------------------------------------------------
         */

        if (
          data.cashReceipts.length ||
          data.referenceLetters.length
        ) {
          doc.addPage();

          drawFinancialTables(
            doc,
            data,
            devanagariAvailable
          );
        }

        /*
         * Add page numbers after the complete
         * document has been generated.
         */
        addPdfFooter(
          doc,
          devanagariAvailable
        );

        doc.end();
      }
    );
  }

  /* =========================================================
     SQLITE DATABASE BACKUP
     ========================================================= */

  function resolveDatabasePath() {
    const configured =
      process.env.DATABASE_PATH;

    if (configured) {
      return path.resolve(
        configured
      );
    }

    return path.resolve(
      __dirname,
      '../../dev.db'
    );
  }

  function backupDirectory() {
    const dbPath =
      resolveDatabasePath();

    return path.join(
      path.dirname(dbPath),
      'backups'
    );
  }

  function escapeSqlString(value) {
    return String(value)
      .replace(/'/g, "''");
  }

  function createDatabaseBackup(
    outputPath
  ) {
    const directory =
      path.dirname(outputPath);

    fs.mkdirSync(
      directory,
      {
        recursive: true,
      }
    );

    /*
     * VACUUM INTO creates a consistent SQLite
     * database snapshot.
     */
    const escaped =
      escapeSqlString(
        outputPath
      );

    db.exec(
      `VACUUM INTO '${escaped}'`
    );

    if (
      !fs.existsSync(
        outputPath
      )
    ) {
      throw new Error(
        'SQLite backup file was not created'
      );
    }

    return outputPath;
  }

  /* =========================================================
     BACKUP MANIFEST
     ========================================================= */

  function createManifest(
    data,
    clinic,
    generatedAt,
    databaseFileName,
    excelFileName,
    pdfFileName
  ) {
    return {
      application:
        'Doctify OPD Management System',

      backupType:
        'Full Clinic Backup',

      clinic,

      generatedAt,

      restoreSource:
        databaseFileName,

      humanReadableFiles: [
        excelFileName,
        pdfFileName,
      ],

      dataSummary:
        data.summary,

      notes: [
        'The SQLite database file is the authoritative restore source.',
        'Excel and PDF files are human-readable exports.',
        'Internal synchronization identifiers are intentionally omitted from human-readable exports.',
        'Deleted records are omitted from the human-readable exports.',
      ],
    };
  }

  function writeManifest(
    manifest,
    outputPath
  ) {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        manifest,
        null,
        2
      ),
      'utf8'
    );

    return outputPath;
  }

  /* =========================================================
     ZIP CREATION
     ========================================================= */

 async function createZipArchive(sourceDirectory, outputPath, folderName) {
  const { ZipArchive } = await import('archiver');

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    let settled = false;

    const succeed = () => {
      if (settled) return;
      settled = true;

      if (!fs.existsSync(outputPath)) {
        reject(new Error('ZIP backup file was not created'));
        return;
      }

      resolve(outputPath);
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    output.on('close', succeed);
    output.on('error', fail);
    archive.on('error', fail);

    archive.pipe(output);
    archive.directory(sourceDirectory, folderName);
    archive.finalize();
  });
}

  /* =========================================================
     FULL BACKUP
     ========================================================= */

  async function createFullBackup(
    options = {}
  ) {
    const clinic =
      options.clinicName ||
      clinicName();

    const now =
      options.date instanceof Date
        ? options.date
        : new Date();

    const generatedAt =
      now.toLocaleString(
        'en-IN'
      );

    const stamp =
      readableBackupDate(
        now
      );

    const safeClinic =
      safeFilePart(
        clinic
      );

    const rootDirectory =
      options.outputDirectory ||
      backupDirectory();

    fs.mkdirSync(
      rootDirectory,
      {
        recursive: true,
      }
    );

    const packageName =
      `Doctify-Full-Backup-${safeClinic}-${stamp}`;

    const packageDirectory =
      path.join(
        rootDirectory,
        packageName
      );

    fs.mkdirSync(
      packageDirectory,
      {
        recursive: true,
      }
    );

    /*
     * Read application data once.
     *
     * The SQLite database snapshot is created separately
     * because it is the real restore source.
     */
    const data =
      options.data ||
      getExportData();

    const databaseFileName =
      `Doctify-Database-${safeClinic}-${stamp}.db`;

    const excelFileName =
      `Doctify-Data-${safeClinic}-${stamp}.xlsx`;

    const pdfFileName =
      `Doctify-Report-${safeClinic}-${stamp}.pdf`;

    const manifestFileName =
      'Backup-Information.json';

    const databasePath =
      path.join(
        packageDirectory,
        databaseFileName
      );

    const excelPath =
      path.join(
        packageDirectory,
        excelFileName
      );

    const pdfPath =
      path.join(
        packageDirectory,
        pdfFileName
      );

    const manifestPath =
      path.join(
        packageDirectory,
        manifestFileName
      );

    /*
     * 1. Full SQLite database
     */
    createDatabaseBackup(
      databasePath
    );

    /*
     * 2. Human-readable Excel
     */
    createExcelExport(
      data,
      excelPath,
      clinic,
      generatedAt
    );

    /*
     * 3. Human-readable PDF
     */
    await createPdfExport(
      data,
      pdfPath,
      clinic,
      generatedAt
    );

    /*
     * 4. Manifest
     */
    const manifest =
      createManifest(
        data,
        clinic,
        generatedAt,
        databaseFileName,
        excelFileName,
        pdfFileName
      );

    writeManifest(
      manifest,
      manifestPath
    );

    /*
     * Zip the complete backup package.
     */
    const zipFileName =
      `${packageName}.zip`;

    const zipPath =
      path.join(
        rootDirectory,
        zipFileName
      );

    await createZipArchive(
      packageDirectory,
      zipPath,
      packageName
    );

    return {
      packageName,

      directory:
        packageDirectory,

      zipPath,

      zipFileName,

      databasePath,

      databaseFileName,

      excelPath,

      excelFileName,

      pdfPath,

      pdfFileName,

      manifestPath,

      manifestFileName,

      clinic,

      generatedAt,

      summary:
        data.summary,
    };
  }

  /* =========================================================
     SIMPLE EXCEL / PDF ALIASES
     ========================================================= */

  const createExcelBackup =
    createExcelExport;

  const createPdfBackup =
    createPdfExport;

  /* =========================================================
     BACKUP FILE HELPERS
     ========================================================= */

  function isSafeBackupFileName(
    fileName
  ) {
    if (!fileName) {
      return false;
    }

    const value =
      String(fileName);

    if (
      value !==
      path.basename(value)
    ) {
      return false;
    }

    /*
     * Only allow files produced by this service.
     */
    return (
      value.startsWith(
        'Doctify-'
      ) ||
      value ===
      'Backup-Information.json'
    );
  }

  function getBackupPath(
    fileName
  ) {
    if (
      !isSafeBackupFileName(
        fileName
      )
    ) {
      return null;
    }

    return path.join(
      backupDirectory(),
      fileName
    );
  }

  function backupExists(
    fileName
  ) {
    const filePath =
      getBackupPath(
        fileName
      );

    if (!filePath) {
      return false;
    }

    return fs.existsSync(
      filePath
    );
  }

  function listBackups() {
    const directory =
      backupDirectory();

    if (
      !fs.existsSync(
        directory
      )
    ) {
      return [];
    }

    return fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
      .filter(
        (entry) =>
          entry.isFile() &&
          (
            entry.name.endsWith(
              '.zip'
            ) ||
            entry.name.endsWith(
              '.db'
            ) ||
            entry.name.endsWith(
              '.xlsx'
            ) ||
            entry.name.endsWith(
              '.pdf'
            )
          )
      )
      .map(
        (entry) => {
          const filePath =
            path.join(
              directory,
              entry.name
            );

          const stats =
            fs.statSync(
              filePath
            );

          return {
            fileName:
              entry.name,

            size:
              stats.size,

            createdAt:
              stats.birthtime.toISOString(),

            modifiedAt:
              stats.mtime.toISOString(),
          };
        }
      )
      .sort(
        (a, b) =>
          new Date(
            b.modifiedAt
          ).getTime() -
          new Date(
            a.modifiedAt
          ).getTime()
      );
  }

  function getLatestBackup() {
    const backups =
      listBackups();

    return backups.length
      ? backups[0]
      : null;
  }

  function removeBackup(
    fileName
  ) {
    const filePath =
      getBackupPath(
        fileName
      );

    if (!filePath) {
      throw new Error(
        'Invalid backup filename'
      );
    }

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      return false;
    }

    fs.unlinkSync(
      filePath
    );

    return true;
  }

  /* =========================================================
     MODULE EXPORTS
     ========================================================= */

  module.exports = {
    getExportData,

    getSummary,

    getPatients,

    getFamilies,

    getVisits,

    getPrescriptions,

    getMedicineCatalog,

    getIllnessCertificates,

    getFitnessCertificates,

    getCashReceipts,

    getReferenceLetters,

    createExcelExport,

    createExcelBackup,

    createPdfExport,

    createPdfBackup,

    createDatabaseBackup,

    createFullBackup,

    backupDirectory,

    backupExists,

    getBackupPath,

    listBackups,

    getLatestBackup,

    removeBackup,

    clinicName,

    resolveDatabasePath,

    safeFilePart,
  };