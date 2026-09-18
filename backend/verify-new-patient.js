const db = require('./src/db/connection');

const patient = db.prepare(`
  SELECT id, name, sync_id, updated_at
  FROM patients
  WHERE name = 'SYNC TRIGGER TEST'
  ORDER BY id DESC
  LIMIT 1
`).get();

const queue = db.prepare(`
  SELECT id, table_name, row_id, row_sync_id, operation, processed_at, last_error
  FROM sync_queue
  WHERE table_name = 'patients'
    AND row_id = ?
`).all(patient.id);

console.log('[SYNC] New patient:', patient);
console.log('[SYNC] Queue:', queue);

db.close();
