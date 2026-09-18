const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./dev.db");

const rows = db.prepare(`
  SELECT id, table_name, row_id
  FROM sync_queue
  WHERE processed_at IS NULL
    AND (row_sync_id IS NULL OR row_sync_id = '')
  ORDER BY id
`).all();

const update = db.prepare(`
  UPDATE sync_queue
  SET processed_at = CURRENT_TIMESTAMP,
      last_error = 'Legacy queue entry: local row no longer exists'
  WHERE id = ?
`);

for (const row of rows) {
  update.run(row.id);
  console.log(
    `Cleared stale queue ${row.id}: ${row.table_name} #${row.row_id}`
  );
}

const remaining = db.prepare(`
  SELECT COUNT(*) AS count
  FROM sync_queue
  WHERE processed_at IS NULL
`).get().count;

console.log(`CLEARED: ${rows.length}`);
console.log(`PENDING REMAINING: ${remaining}`);
