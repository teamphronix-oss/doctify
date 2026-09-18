const db = require('./src/db/connection');

const tables = [
  'hospitals',
  'families',
  'patients',
  'visits',
  'medicines',
  'presets',
  'medicine_catalog',
  'fitness_certificates',
  'illness_certificates',
  'cash_receipts',
  'reference_letters',
  'form_definitions',
  'form_fields',
  'custom_field_values'
];

console.log('\n=== SCHEMA CHECK ===');

for (const table of tables) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const names = columns.map(c => c.name);

  console.log(
    `${table}:`,
    [
      `sync_id=${names.includes('sync_id')}`,
      `updated_at=${names.includes('updated_at')}`,
      `deleted_at=${names.includes('deleted_at')}`,
      `hospital_id=${names.includes('hospital_id')}`
    ].join(' | ')
  );
}

console.log('\n=== RELATIONSHIP CHECK ===');

const checks = [
  [
    'patients -> families',
    `SELECT COUNT(*) AS bad
     FROM patients
     WHERE family_id IS NOT NULL
       AND (
         family_sync_id IS NULL
         OR family_sync_id != (
           SELECT sync_id FROM families
           WHERE families.id = patients.family_id
         )
       )`
  ],
  [
    'visits -> patients',
    `SELECT COUNT(*) AS bad
     FROM visits
     WHERE patient_id IS NOT NULL
       AND (
         patient_sync_id IS NULL
         OR patient_sync_id != (
           SELECT sync_id FROM patients
           WHERE patients.id = visits.patient_id
         )
       )`
  ],
  [
    'medicines -> visits',
    `SELECT COUNT(*) AS bad
     FROM medicines
     WHERE visit_id IS NOT NULL
       AND (
         visit_sync_id IS NULL
         OR visit_sync_id != (
           SELECT sync_id FROM visits
           WHERE visits.id = medicines.visit_id
         )
       )`
  ]
];

for (const [name, sql] of checks) {
  console.log(name, db.prepare(sql).get());
}

console.log('\n=== PENDING QUEUE ===');

console.log(
  db.prepare(`
    SELECT
      COUNT(*) AS pending,
      SUM(
        CASE
          WHEN row_sync_id IS NULL OR row_sync_id = ''
          THEN 1
          ELSE 0
        END
      ) AS missing_sync_ids
    FROM sync_queue
    WHERE processed_at IS NULL
  `).get()
);

console.log('\n=== TRIGGER CHECK ===');

const triggers = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'trigger'
    AND (
      name LIKE 'trg_sync_%'
      OR name LIKE 'trg_metadata_%'
    )
  ORDER BY name
`).all();

for (const trigger of triggers) {
  console.log(trigger.name);
}

db.close();
