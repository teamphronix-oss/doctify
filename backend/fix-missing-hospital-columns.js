const db = require('./src/db/connection');

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();

  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[DB] Added ${table}.${column}`);
  } else {
    console.log(`[DB] ${table}.${column} already exists`);
  }
}

// ------------------------------------------------------------
// 1. Add missing hospital_id columns
// ------------------------------------------------------------

addColumnIfMissing('visits', 'hospital_id', 'INTEGER');
addColumnIfMissing('medicines', 'hospital_id', 'INTEGER');
addColumnIfMissing('form_fields', 'hospital_id', 'INTEGER');

// ------------------------------------------------------------
// 2. Backfill visits from patients
// ------------------------------------------------------------

db.exec(`
  UPDATE visits
  SET hospital_id = (
    SELECT hospital_id
    FROM patients
    WHERE patients.id = visits.patient_id
  )
  WHERE hospital_id IS NULL
    AND patient_id IS NOT NULL
`);

// ------------------------------------------------------------
// 3. Backfill medicines from visits
// ------------------------------------------------------------

db.exec(`
  UPDATE medicines
  SET hospital_id = (
    SELECT hospital_id
    FROM visits
    WHERE visits.id = medicines.visit_id
  )
  WHERE hospital_id IS NULL
    AND visit_id IS NOT NULL
`);

// ------------------------------------------------------------
// 4. Backfill form_fields from form_definitions
// ------------------------------------------------------------

db.exec(`
  UPDATE form_fields
  SET hospital_id = (
    SELECT hospital_id
    FROM form_definitions
    WHERE form_definitions.id = form_fields.form_definition_id
  )
  WHERE hospital_id IS NULL
    AND form_definition_id IS NOT NULL
`);

// ------------------------------------------------------------
// 5. Verify
// ------------------------------------------------------------

console.log('\n[VERIFY] Hospital IDs:');

for (const table of [
  'visits',
  'medicines',
  'form_fields'
]) {
  const result = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN hospital_id IS NULL THEN 1 ELSE 0 END) AS missing
    FROM ${table}
  `).get();

  console.log(`${table}:`, result);
}

db.close();
