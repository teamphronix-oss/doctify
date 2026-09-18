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
  SET row_sync_id = ?
  WHERE id = ?
`);

let fixed = 0;

for (const queue of rows) {
  const row = db
    .prepare(`
      SELECT sync_id
      FROM "${queue.table_name}"
      WHERE id = ?
      LIMIT 1
    `)
    .get(queue.row_id);

  if (row?.sync_id) {
    update.run(row.sync_id, queue.id);
    console.log(
      `Fixed queue ${queue.id}: ${queue.table_name} #${queue.row_id}`
    );
    fixed++;
  } else {
    console.log(
      `SKIPPED queue ${queue.id}: ${queue.table_name} #${queue.row_id} - row not found`
    );
  }
}

console.log(`FIXED: ${fixed}/${rows.length}`);
