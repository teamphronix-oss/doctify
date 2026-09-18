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

function uuidExpression() {
  return `
    lower(
      hex(randomblob(4)) || '-' ||
      hex(randomblob(2)) || '-' ||
      '4' || substr(hex(randomblob(2)), 2) || '-' ||
      substr('89ab', 1 + (abs(random()) % 4), 1) ||
      substr(hex(randomblob(2)), 2) || '-' ||
      hex(randomblob(6))
    )
  `;
}

for (const table of tables) {
  const safe = table.replace(/[^a-zA-Z0-9_]/g, '');

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_metadata_${safe}_insert
    AFTER INSERT ON ${safe}
    WHEN NEW.sync_id IS NULL OR NEW.sync_id = ''
    BEGIN
      UPDATE ${safe}
      SET
        sync_id = ${uuidExpression()},
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE id = NEW.id;
    END;
  `);
}

console.log('[SYNC] New-row metadata triggers installed.');

const patient = db.prepare(`
  SELECT id, sync_id, updated_at
  FROM patients
  WHERE id = 11
`).get();

console.log('[SYNC] Test patient:', patient);

db.close();
