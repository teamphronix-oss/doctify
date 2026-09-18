const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./dev.db");

const bad = db.prepare(`
  SELECT id, table_name, row_id, row_sync_id
  FROM sync_queue
  WHERE processed_at IS NULL
    AND (row_sync_id IS NULL OR row_sync_id = '')
  ORDER BY id
`).all();

console.log("LEGACY QUEUE ITEMS:", bad.length);
console.table(bad);
