const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');

const dbPath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, '../../dev.db');

const db = new DatabaseSync(dbPath);


// ============================================================
// 1. CREATE BASE TABLES
// ============================================================

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema);


// ============================================================
// 2. MIGRATION HELPERS
// ============================================================

function columnExists(table, column) {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all();

  return columns.some(
    (item) => item.name === column
  );
}

function addColumnIfMissing(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`
      ALTER TABLE ${table}
      ADD COLUMN ${column} ${definition}
    `);

    console.log(`[DB] Added ${table}.${column}`);
  }
}

function indexExists(name) {
  const row = db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'index'
        AND name = ?
    `)
    .get(name);

  return Boolean(row);
}


// ============================================================
// 3. EXISTING DATABASE MIGRATIONS
// ============================================================

const syncTables = [
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
];


// ------------------------------------------------------------
// Add sync_id
// ------------------------------------------------------------

for (const table of syncTables) {
  addColumnIfMissing(
    table,
    'sync_id',
    'TEXT'
  );
}


// ------------------------------------------------------------
// Add updated_at
// ------------------------------------------------------------

for (const table of syncTables) {
  addColumnIfMissing(
    table,
    'updated_at',
    'TEXT'
  );
}


// ------------------------------------------------------------
// Add deleted_at
// ------------------------------------------------------------

for (const table of syncTables) {
  addColumnIfMissing(
    table,
    'deleted_at',
    'TEXT'
  );
}


// ============================================================
// 3A. HOSPITAL RELATIONSHIP COLUMNS
// ============================================================

addColumnIfMissing(
  'visits',
  'hospital_id',
  'INTEGER'
);

addColumnIfMissing(
  'medicines',
  'hospital_id',
  'INTEGER'
);

addColumnIfMissing(
  'form_fields',
  'hospital_id',
  'INTEGER'
);


// Backfill visit hospital IDs.

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


// Backfill medicine hospital IDs.

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


// Backfill form-field hospital IDs.

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


// ============================================================
// 3B. STABLE RELATIONSHIP SYNC IDs
// ============================================================

addColumnIfMissing(
  'patients',
  'family_sync_id',
  'TEXT'
);

addColumnIfMissing(
  'visits',
  'patient_sync_id',
  'TEXT'
);

addColumnIfMissing(
  'medicines',
  'visit_sync_id',
  'TEXT'
);


// ------------------------------------------------------------
// Backfill patient -> family sync relationship
// ------------------------------------------------------------

db.exec(`
  UPDATE patients
  SET family_sync_id = (
    SELECT sync_id
    FROM families
    WHERE families.id = patients.family_id
  )
  WHERE family_id IS NOT NULL
    AND (
      family_sync_id IS NULL
      OR family_sync_id = ''
    )
`);


// ------------------------------------------------------------
// Backfill visit -> patient sync relationship
// ------------------------------------------------------------

db.exec(`
  UPDATE visits
  SET patient_sync_id = (
    SELECT sync_id
    FROM patients
    WHERE patients.id = visits.patient_id
  )
  WHERE patient_id IS NOT NULL
    AND (
      patient_sync_id IS NULL
      OR patient_sync_id = ''
    )
`);


// ------------------------------------------------------------
// Backfill medicine -> visit sync relationship
// ------------------------------------------------------------

db.exec(`
  UPDATE medicines
  SET visit_sync_id = (
    SELECT sync_id
    FROM visits
    WHERE visits.id = medicines.visit_id
  )
  WHERE visit_id IS NOT NULL
    AND (
      visit_sync_id IS NULL
      OR visit_sync_id = ''
    )
`);


// ------------------------------------------------------------
// Indexes
// ------------------------------------------------------------

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_patients_family_sync_id
  ON patients(family_sync_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_visits_patient_sync_id
  ON visits(patient_sync_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_medicines_visit_sync_id
  ON medicines(visit_sync_id)
`);


// ============================================================
// 3C. KEEP STABLE RELATIONSHIP SYNC IDs IN STEP
// ============================================================

db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_patients_family_sync_id
  AFTER INSERT ON patients
  BEGIN
    UPDATE patients
    SET family_sync_id = (
      SELECT sync_id
      FROM families
      WHERE families.id = patients.family_id
    )
    WHERE patients.id = NEW.id
      AND NEW.family_id IS NOT NULL;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_patients_family_sync_id_update
  AFTER UPDATE OF family_id ON patients
  BEGIN
    UPDATE patients
    SET family_sync_id = (
      SELECT sync_id
      FROM families
      WHERE families.id = patients.family_id
    )
    WHERE patients.id = NEW.id
      AND NEW.family_id IS NOT NULL;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_visits_patient_sync_id
  AFTER INSERT ON visits
  BEGIN
    UPDATE visits
    SET patient_sync_id = (
      SELECT sync_id
      FROM patients
      WHERE patients.id = visits.patient_id
    )
    WHERE visits.id = NEW.id
      AND NEW.patient_id IS NOT NULL;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_visits_patient_sync_id_update
  AFTER UPDATE OF patient_id ON visits
  BEGIN
    UPDATE visits
    SET patient_sync_id = (
      SELECT sync_id
      FROM patients
      WHERE patients.id = visits.patient_id
    )
    WHERE visits.id = NEW.id
      AND NEW.patient_id IS NOT NULL;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_medicines_visit_sync_id
  AFTER INSERT ON medicines
  BEGIN
    UPDATE medicines
    SET visit_sync_id = (
      SELECT sync_id
      FROM visits
      WHERE visits.id = medicines.visit_id
    )
    WHERE medicines.id = NEW.id
      AND NEW.visit_id IS NOT NULL;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_medicines_visit_sync_id_update
  AFTER UPDATE OF visit_id ON medicines
  BEGIN
    UPDATE medicines
    SET visit_sync_id = (
      SELECT sync_id
      FROM visits
      WHERE visits.id = medicines.visit_id
    )
    WHERE medicines.id = NEW.id
      AND NEW.visit_id IS NOT NULL;
  END;
`);


// ============================================================
// 4. EXISTING APPLICATION MIGRATIONS
// ============================================================

addColumnIfMissing(
  'cash_receipts',
  'description',
  'TEXT'
);

addColumnIfMissing(
  'reference_letters',
  'patient_name',
  'TEXT'
);

addColumnIfMissing(
  'reference_letters',
  'referred_to',
  'TEXT'
);

addColumnIfMissing(
  'reference_letters',
  'reason',
  'TEXT'
);

addColumnIfMissing(
  'reference_letters',
  'urgency',
  'TEXT'
);


// ============================================================
// 4A. CLINIC DETAILS (printed on prescriptions) + LOGIN CODE RULES
// ============================================================

addColumnIfMissing('hospitals', 'address', 'TEXT');
addColumnIfMissing('hospitals', 'doctor_name', 'TEXT');
addColumnIfMissing('hospitals', 'qualification', 'TEXT');
addColumnIfMissing('hospitals', 'reg_no', 'TEXT');

// A doctor logs in with just user code + PIN, so a user code must be
// unique across the whole system.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_code_unique
  ON users(user_code)
`);


// ============================================================
// 5. ENSURE DEMO HOSPITAL EXISTS
// ============================================================

db.prepare(`
  INSERT OR IGNORE INTO hospitals
    (id, name, code)
  VALUES
    (1, 'Demo Clinic', 'DEMO001')
`).run();


// ============================================================
// 6. BACKFILL UPDATED_AT
// ============================================================

for (const table of syncTables) {
  if (!columnExists(table, 'updated_at')) {
    continue;
  }

  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);

  if (columns.includes('created_at')) {
    db.exec(`
      UPDATE ${table}
      SET updated_at = created_at
      WHERE updated_at IS NULL
    `);
  } else if (
    table === 'visits' &&
    columns.includes('visit_date')
  ) {
    db.exec(`
      UPDATE visits
      SET updated_at = visit_date
      WHERE updated_at IS NULL
    `);
  } else {
    db.exec(`
      UPDATE ${table}
      SET updated_at = CURRENT_TIMESTAMP
      WHERE updated_at IS NULL
    `);
  }
}


// ============================================================
// 7. GENERATE SYNC IDs FOR EXISTING DATA
// ============================================================

for (const table of syncTables) {
  const rows = db.prepare(`
    SELECT id
    FROM ${table}
    WHERE sync_id IS NULL
       OR sync_id = ''
  `).all();

  const update = db.prepare(`
    UPDATE ${table}
    SET sync_id = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(
      crypto.randomUUID(),
      row.id
    );
  }
}


// ============================================================
// 8. INDEXES
// ============================================================

for (const table of syncTables) {
  const indexName = `idx_${table}_sync_id`;

  if (!indexExists(indexName)) {
    db.exec(`
      CREATE INDEX ${indexName}
      ON ${table}(sync_id)
    `);
  }
}


const normalIndexes = [
  `
    CREATE INDEX IF NOT EXISTS idx_users_user_code
    ON users(user_code)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_clinic_users_hospital
    ON clinic_users(hospital_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_clinic_users_user
    ON clinic_users(user_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_patients_phone
    ON patients(phone)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_patients_name
    ON patients(name)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_patients_hospital
    ON patients(hospital_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_families_hospital
    ON families(hospital_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_visits_patient
    ON visits(patient_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_visits_date
    ON visits(visit_date)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_medicines_visit
    ON medicines(visit_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_presets_type_lang
    ON presets(medicine_type, language)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_catalog_name
    ON medicine_catalog(name)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_sync_queue_pending
    ON sync_queue(processed_at, id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_form_definitions_hospital
    ON form_definitions(hospital_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_form_definitions_sync_id
    ON form_definitions(sync_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_form_fields_definition
    ON form_fields(form_definition_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_form_fields_sync_id
    ON form_fields(sync_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_custom_values_entity
    ON custom_field_values(entity_type, entity_sync_id)
  `,

  `
    CREATE INDEX IF NOT EXISTS idx_custom_values_sync_id
    ON custom_field_values(sync_id)
  `,
];

for (const sql of normalIndexes) {
  db.exec(sql);
}


// ============================================================
// 9. UPGRADE EXISTING SYNC QUEUE
// ============================================================

addColumnIfMissing(
  'sync_queue',
  'row_sync_id',
  'TEXT'
);

addColumnIfMissing(
  'sync_queue',
  'attempts',
  'INTEGER NOT NULL DEFAULT 0'
);


// Populate row_sync_id for old queue entries.

for (const table of syncTables) {
  db.prepare(`
    UPDATE sync_queue
    SET row_sync_id = (
      SELECT sync_id
      FROM ${table}
      WHERE ${table}.id = sync_queue.row_id
    )
    WHERE table_name = ?
      AND (
        row_sync_id IS NULL
        OR row_sync_id = ''
      )
  `).run(table);
}


// ============================================================
// 10. DEVICE IDENTITY
// ============================================================

db.prepare(`
  INSERT OR IGNORE INTO device_identity
    (id, device_id)
  VALUES
    (1, ?)
`).run(
  crypto.randomUUID()
);


// ============================================================
// 11. SYNC STATE
// ============================================================

db.prepare(`
  INSERT OR IGNORE INTO sync_state
    (key, value)
  VALUES
    ('last_success_at', NULL)
`).run();

db.prepare(`
  INSERT OR IGNORE INTO sync_state
    (key, value)
  VALUES
    ('last_error', NULL)
`).run();


// ============================================================
// 12. CUSTOMIZATION TABLE SYNC IDs
// ============================================================

for (const table of [
  'form_definitions',
  'form_fields',
  'custom_field_values',
]) {
  const rows = db.prepare(`
    SELECT id
    FROM ${table}
    WHERE sync_id IS NULL
       OR sync_id = ''
  `).all();

  const update = db.prepare(`
    UPDATE ${table}
    SET sync_id = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(
      crypto.randomUUID(),
      row.id
    );
  }
}


// ============================================================
// 13. SYNC RUNTIME GUARD
// ============================================================
//
// IMPORTANT:
//
// This table MUST exist before the sync triggers are created.
//
// pulling = 1
//     means SQLite is currently receiving cloud data.
//
// pulling = 0
//     means normal local changes should enter sync_queue.
//
// ============================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS sync_runtime (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO sync_runtime (key, value)
  VALUES ('pulling', '0');
`);


// ============================================================
// 14. SYNC TRIGGERS
// ============================================================

const allSyncTables = [
  ...syncTables,
  'form_definitions',
  'form_fields',
  'custom_field_values',
];

for (const table of allSyncTables) {
  const safe = table.replace(
    /[^a-zA-Z0-9_]/g,
    ''
  );


  // ----------------------------------------------------------
  // INSERT
  // ----------------------------------------------------------
  //
  // Generate sync metadata before putting the row into the queue.
  //
  // This guarantees row_sync_id is never NULL for new records.
  //
  
  db.exec(`
    DROP TRIGGER IF EXISTS trg_sync_${safe}_insert;
  `);

  db.exec(`
    CREATE TRIGGER trg_sync_${safe}_insert
    AFTER INSERT ON ${safe}
    BEGIN

      UPDATE ${safe}
      SET
        sync_id = CASE
          WHEN NEW.sync_id IS NULL OR NEW.sync_id = ''
          THEN lower(
            hex(randomblob(4)) || '-' ||
            hex(randomblob(2)) || '-' ||
            '4' || substr(hex(randomblob(2)), 2) || '-' ||
            substr('89ab', 1 + (abs(random()) % 4), 1) ||
            substr(hex(randomblob(2)), 2) || '-' ||
            hex(randomblob(6))
          )
          ELSE NEW.sync_id
        END,

        updated_at = CASE
          WHEN NEW.updated_at IS NULL OR NEW.updated_at = ''
          THEN CURRENT_TIMESTAMP
          ELSE NEW.updated_at
        END

      WHERE id = NEW.id;


      INSERT INTO sync_queue (
        table_name,
        row_id,
        row_sync_id,
        operation,
        queued_at,
        processed_at,
        last_error
      )

      SELECT
        '${safe}',
        id,
        sync_id,
        'upsert',
        CURRENT_TIMESTAMP,
        NULL,
        NULL

      FROM ${safe}

      WHERE id = NEW.id

      ON CONFLICT(table_name, row_id)

      DO UPDATE SET
        row_sync_id = excluded.row_sync_id,
        operation = 'upsert',
        queued_at = CURRENT_TIMESTAMP,
        processed_at = NULL,
        last_error = NULL;

    END;
  `);


  // ----------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------
  //
  // IMPORTANT:
  //
  // If data is being written into SQLite by the cloud PULL,
  // DO NOT create a new sync_queue entry.
  //
  // Otherwise:
  //
  // Supabase
  //   ↓
  // SQLite
  //   ↓
  // sync_queue
  //   ↓
  // Supabase
  //   ↓
  // SQLite
  //   ↓
  // sync_queue
  //
  // This creates the feedback loop we just discovered.
  //

  db.exec(`
    DROP TRIGGER IF EXISTS trg_sync_${safe}_update;
  `);

  db.exec(`
    CREATE TRIGGER trg_sync_${safe}_update
    AFTER UPDATE ON ${safe}

    WHEN NOT EXISTS (
      SELECT 1
      FROM sync_runtime
      WHERE key = 'pulling'
        AND value = '1'
    )

    BEGIN

      INSERT INTO sync_queue (
        table_name,
        row_id,
        row_sync_id,
        operation,
        queued_at,
        processed_at,
        last_error
      )

      VALUES (
        '${safe}',
        NEW.id,
        NEW.sync_id,
        'upsert',
        CURRENT_TIMESTAMP,
        NULL,
        NULL
      )

      ON CONFLICT(table_name, row_id)

      DO UPDATE SET
        row_sync_id = NEW.sync_id,
        operation = 'upsert',
        queued_at = CURRENT_TIMESTAMP,
        processed_at = NULL,
        last_error = NULL;

    END;
  `);


  // ----------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------
  //
  // Same protection for cloud-originated deletes.
  //

  db.exec(`
    DROP TRIGGER IF EXISTS trg_sync_${safe}_delete;
  `);

  db.exec(`
    CREATE TRIGGER trg_sync_${safe}_delete
    AFTER DELETE ON ${safe}

    WHEN NOT EXISTS (
      SELECT 1
      FROM sync_runtime
      WHERE key = 'pulling'
        AND value = '1'
    )

    BEGIN

      INSERT INTO sync_queue (
        table_name,
        row_id,
        row_sync_id,
        operation,
        queued_at,
        processed_at,
        last_error
      )

      VALUES (
        '${safe}',
        OLD.id,
        OLD.sync_id,
        'delete',
        CURRENT_TIMESTAMP,
        NULL,
        NULL
      )

      ON CONFLICT(table_name, row_id)

      DO UPDATE SET
        row_sync_id = OLD.sync_id,
        operation = 'delete',
        queued_at = CURRENT_TIMESTAMP,
        processed_at = NULL,
        last_error = NULL;

    END;
  `);
}


// ============================================================
// 15. FINAL CHECK
// ============================================================

db.exec(`
  UPDATE sync_runtime
  SET value = '0'
  WHERE key = 'pulling';
`);

console.log('[DB] Doctify SQLite foundation ready.');

module.exports = db;