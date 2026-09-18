-- ============================================================
-- DOCTIFY OPD DATABASE - BASE SCHEMA
-- ============================================================
--
-- IMPORTANT:
-- Existing databases are upgraded by connection.js.
-- Do not put indexes/triggers depending on migration columns
-- here because an existing table may not yet have those columns.
-- ============================================================


CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL DEFAULT 1,
  label TEXT
);


CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id INTEGER NOT NULL DEFAULT 1,
  family_id INTEGER,
  name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id)
);


CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  visit_date TEXT DEFAULT CURRENT_TIMESTAMP,

  bp TEXT,
  pulse TEXT,
  spo2 TEXT,
  weight TEXT,
  height TEXT,
  temp TEXT,

  past_history TEXT,
  allergies TEXT,
  complaints TEXT,
  oe TEXT,

  quick_note TEXT,
  diagnosis TEXT,
  suggestions TEXT,
  investigations TEXT,
  opd_medicine TEXT,

  follow_up_period INTEGER,
  follow_up_unit TEXT,

  FOREIGN KEY (patient_id) REFERENCES patients(id)
);


CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,

  type TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'mr-IN',
  instructions TEXT,

  morning INTEGER DEFAULT 0,
  afternoon INTEGER DEFAULT 0,
  night INTEGER DEFAULT 0,

  food_timing TEXT DEFAULT 'Before',
  quantity INTEGER DEFAULT 1,

  FOREIGN KEY (visit_id) REFERENCES visits(id)
);


CREATE TABLE IF NOT EXISTS presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER,
  medicine_type TEXT NOT NULL,
  language TEXT NOT NULL,
  label TEXT NOT NULL,

  morning INTEGER DEFAULT 0,
  afternoon INTEGER DEFAULT 0,
  night INTEGER DEFAULT 0,

  food_timing TEXT DEFAULT 'Before'
);


CREATE TABLE IF NOT EXISTS medicine_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS fitness_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER NOT NULL DEFAULT 1,

  patient_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,

  examination_date TEXT NOT NULL,
  fitness_type TEXT NOT NULL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS illness_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER NOT NULL DEFAULT 1,

  patient_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,

  examination_date TEXT NOT NULL,
  diagnosis TEXT NOT NULL,

  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  resume_date TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS cash_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER NOT NULL DEFAULT 1,

  patient_name TEXT NOT NULL,
  age_sex TEXT,

  amount REAL NOT NULL,
  amount_words TEXT,
  description TEXT,

  consult_date TEXT NOT NULL,
  custom_date TEXT,

  payment_source TEXT DEFAULT 'manual',
  gateway_reference TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS reference_letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER NOT NULL DEFAULT 1,

  patient_name TEXT,
  referred_to TEXT,
  reason TEXT,
  urgency TEXT DEFAULT 'Routine',

  reference_text TEXT NOT NULL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- APPLICATION SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- SYNC QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  table_name TEXT NOT NULL,
  row_id INTEGER NOT NULL,

  operation TEXT NOT NULL
    CHECK(operation IN ('upsert', 'delete')),

  queued_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  last_error TEXT,

  UNIQUE(table_name, row_id)
);


-- ============================================================
-- SYNC STATE
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- DEVICE IDENTITY
-- ============================================================

CREATE TABLE IF NOT EXISTS device_identity (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  device_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- CUSTOM FORM DEFINITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS form_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER NOT NULL,
  sync_id TEXT,

  form_key TEXT NOT NULL,
  name TEXT NOT NULL,

  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,

  FOREIGN KEY (hospital_id)
    REFERENCES hospitals(id),

  UNIQUE(hospital_id, form_key, version)
);


CREATE TABLE IF NOT EXISTS form_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  form_definition_id INTEGER NOT NULL,
  sync_id TEXT,

  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,

  required INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,

  sort_order INTEGER NOT NULL DEFAULT 0,

  placeholder TEXT,
  help_text TEXT,

  options_json TEXT,
  validation_json TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,

  FOREIGN KEY (form_definition_id)
    REFERENCES form_definitions(id)
);


CREATE TABLE IF NOT EXISTS custom_field_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  hospital_id INTEGER NOT NULL,

  sync_id TEXT,

  entity_type TEXT NOT NULL,
  entity_sync_id TEXT NOT NULL,

  field_id INTEGER NOT NULL,

  value_json TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,

  FOREIGN KEY (hospital_id)
    REFERENCES hospitals(id),

  FOREIGN KEY (field_id)
    REFERENCES form_fields(id),

  UNIQUE(entity_type, entity_sync_id, field_id)
);