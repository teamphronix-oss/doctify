const db = require('./src/db/connection');

const patient = db.prepare(`
  SELECT id, sync_id, updated_at
  FROM patients
  WHERE id = 11
`).get();

const queue = db.prepare(`
  SELECT id, table_name, row_id, row_sync_id, operation, processed_at, last_error
  FROM sync_queue
  WHERE table_name = 'patients'
    AND row_id = 11
  ORDER BY id DESC
`).all();

console.log('[SYNC] Patient:', patient);
console.log('[SYNC] Queue:', queue);

db.close();
