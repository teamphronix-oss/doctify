const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("./dev.db");

db.exec("BEGIN");

try {
  db.exec(`
    UPDATE patients
    SET family_sync_id = (
      SELECT sync_id
      FROM families
      WHERE families.id = patients.family_id
    )
    WHERE family_id IS NOT NULL
  `);

  db.exec(`
    UPDATE visits
    SET patient_sync_id = (
      SELECT sync_id
      FROM patients
      WHERE patients.id = visits.patient_id
    )
    WHERE patient_id IS NOT NULL
  `);

  db.exec(`
    UPDATE medicines
    SET visit_sync_id = (
      SELECT sync_id
      FROM visits
      WHERE visits.id = medicines.visit_id
    )
    WHERE visit_id IS NOT NULL
  `);

  db.exec(`
    UPDATE sync_queue
    SET processed_at = NULL,
        last_error = NULL
    WHERE processed_at IS NOT NULL
  `);

  db.exec("COMMIT");

  const pending = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM sync_queue
      WHERE processed_at IS NULL
    `)
    .get().count;

  console.log("PREPARATION COMPLETE");
  console.log("PENDING:", pending);
} catch (error) {
  db.exec("ROLLBACK");
  console.error("PREPARATION FAILED:", error.message);
  process.exitCode = 1;
}
