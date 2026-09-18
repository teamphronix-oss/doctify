const db = require('../db/connection');

const TABLES = [
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
  'custom_field_values',
];

const PUSH_ORDER = [
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
  'custom_field_values',
];

const HOSPITAL_ID = 1;
const CHANGE_BATCH_SIZE = 500;
let timer = null;
let running = false;

let lastRun = null;
let lastError = null;
let lastPushCount = 0;
let lastPullCount = 0;

function isConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isOnlineMode() {
  return (
    db
      .prepare(
        "SELECT value FROM app_settings WHERE key = 'data_mode'"
      )
      .get()?.value === 'online'
  );
}

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function tableUrl(table) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');

  if (!base) {
    throw new Error('SUPABASE_URL is not configured');
  }

  return `${base}/rest/v1/${table}`;
}

function quoteIdentifier(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `"${value}"`;
}

/* ============================================================
   LOCAL LOOKUPS
============================================================ */

function getLocalRow(table, syncId) {
  const safeTable = quoteIdentifier(table);

  return db
    .prepare(
      `SELECT * FROM ${safeTable} WHERE sync_id = ? LIMIT 1`
    )
    .get(syncId);
}

function getLocalById(table, id) {
  if (!id) {
    return null;
  }

  const safeTable = quoteIdentifier(table);

  return db
    .prepare(
      `SELECT * FROM ${safeTable} WHERE id = ? LIMIT 1`
    )
    .get(id);
}

/* ============================================================
   SUPABASE LOOKUPS
============================================================ */

async function getCloudIdBySyncId(table, syncId) {
  if (!syncId) {
    return null;
  }

  const url =
    `${tableUrl(table)}` +
    `?select=id&sync_id=eq.${encodeURIComponent(syncId)}` +
    `&limit=1`;

  const response = await fetch(url, {
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase lookup ${table}/${syncId}: ${await response.text()}`
    );
  }

  const rows = await response.json();

  return rows[0]?.id ?? null;
}

/*
 * Resolve a local parent record to its CLOUD integer id.
 *
 * SQLite integer IDs are local-only.
 * Supabase integer IDs are cloud-local.
 * sync_id connects the two systems.
 */
async function resolveCloudParentId(table, localId) {
  const localRow = getLocalById(table, localId);

  if (!localRow) {
    throw new Error(
      `Cannot resolve ${table}: local id ${localId} does not exist`
    );
  }

  if (!localRow.sync_id) {
    throw new Error(
      `Cannot resolve ${table}: local id ${localId} has no sync_id`
    );
  }

  return getCloudIdBySyncId(table, localRow.sync_id);
}

/* ============================================================
   RELATIONSHIP DEPENDENCIES
============================================================ */

async function ensurePatientFamily(row) {
  if (!row.family_id) {
    return null;
  }

  const family = getLocalById('families', row.family_id);

  if (!family) {
    throw new Error(
      `Patient ${row.sync_id} references missing family ${row.family_id}`
    );
  }

  if (!family.sync_id) {
    throw new Error(
      `Family ${row.family_id} does not have a sync_id`
    );
  }

  await pushRecord('families', family);

  const cloudFamilyId = await getCloudIdBySyncId(
    'families',
    family.sync_id
  );

  if (!cloudFamilyId) {
    throw new Error(
      `Family ${family.sync_id} was pushed but could not be found in Supabase`
    );
  }

  return cloudFamilyId;
}

async function ensureVisitPatient(row) {
  if (!row.patient_id) {
    return null;
  }

  const patient = getLocalById('patients', row.patient_id);

  if (!patient) {
    throw new Error(
      `Visit ${row.sync_id} references missing patient ${row.patient_id}`
    );
  }

  await ensurePatientFamily(patient);
  await pushRecord('patients', patient);

  const cloudPatientId = await getCloudIdBySyncId(
    'patients',
    patient.sync_id
  );

  if (!cloudPatientId) {
    throw new Error(
      `Patient ${patient.sync_id} was pushed but could not be found in Supabase`
    );
  }

  return cloudPatientId;
}

async function ensureMedicineVisit(row) {
  if (!row.visit_id) {
    return null;
  }

  const visit = getLocalById('visits', row.visit_id);

  if (!visit) {
    throw new Error(
      `Medicine ${row.sync_id} references missing visit ${row.visit_id}`
    );
  }

  await ensureVisitPatient(visit);
  await pushRecord('visits', visit);

  const cloudVisitId = await getCloudIdBySyncId(
    'visits',
    visit.sync_id
  );

  if (!cloudVisitId) {
    throw new Error(
      `Visit ${visit.sync_id} was pushed but could not be found in Supabase`
    );
  }

  return cloudVisitId;
}

/* ============================================================
   BUILD CLOUD PAYLOAD
============================================================ */

/*
 * CRITICAL:
 *
 * SQLite's integer id is NEVER sent as the Supabase identity.
 *
 * Relationships are resolved:
 *
 * local patient.id
 *       ↓
 * patient.sync_id
 *       ↓
 * Supabase patient.id
 *
 * This prevents two devices from accidentally sharing/conflicting
 * integer IDs.
 */

async function buildCloudPayload(table, row) {
  const payload = {
    ...row,
  };

  // ----------------------------------------------------------
  // NEVER send local SQLite primary key.
  // Supabase generates/owns its own integer id.
  // ----------------------------------------------------------

  delete payload.id;

  // ----------------------------------------------------------
  // PATIENT → FAMILY
  // ----------------------------------------------------------

  if (table === 'patients') {
    delete payload.family_id;

    if (row.family_id) {
      const cloudFamilyId = await ensurePatientFamily(row);

      payload.family_id = cloudFamilyId;
    }

    // Stable relationship identity remains in cloud.
    if (!row.family_sync_id && row.family_id) {
      const family = getLocalById('families', row.family_id);

      if (family?.sync_id) {
        payload.family_sync_id = family.sync_id;
      }
    }
  }

  // ----------------------------------------------------------
  // VISIT → PATIENT
  // ----------------------------------------------------------

  if (table === 'visits') {
    delete payload.patient_id;

    if (row.patient_id) {
      const cloudPatientId = await ensureVisitPatient(row);

      payload.patient_id = cloudPatientId;
    }

    if (!row.patient_sync_id && row.patient_id) {
      const patient = getLocalById('patients', row.patient_id);

      if (patient?.sync_id) {
        payload.patient_sync_id = patient.sync_id;
      }
    }
  }

  // ----------------------------------------------------------
  // MEDICINE → VISIT
  // ----------------------------------------------------------

  if (table === 'medicines') {
    delete payload.visit_id;

    if (row.visit_id) {
      const cloudVisitId = await ensureMedicineVisit(row);

      payload.visit_id = cloudVisitId;
    }

    if (!row.visit_sync_id && row.visit_id) {
      const visit = getLocalById('visits', row.visit_id);

      if (visit?.sync_id) {
        payload.visit_sync_id = visit.sync_id;
      }
    }
  }

  return payload;
}

/* ============================================================
   PUSH ONE RECORD
============================================================ */

async function pushRecord(table, row) {
  if (!row) {
    return;
  }

  if (!row.sync_id) {
    throw new Error(
      `Cannot sync ${table}: row has no sync_id`
    );
  }

  /*
   * Tombstone.
   *
   * We keep the cloud row and mark it deleted.
   */
  if (row.deleted_at) {
    const url =
      `${tableUrl(table)}` +
      `?sync_id=eq.${encodeURIComponent(row.sync_id)}`;

    const payload = {
      deleted_at: row.deleted_at,
      updated_at: row.updated_at || new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers(),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Supabase tombstone ${table}/${row.sync_id}: ${await response.text()}`
      );
    }

    return;
  }

  const payload = await buildCloudPayload(table, row);

  /*
   * sync_id is the ONLY conflict identity.
   *
   * The integer SQLite id was removed above.
   */
  const response = await fetch(
    `${tableUrl(table)}?on_conflict=sync_id`,
    {
      method: 'POST',
      headers: {
        ...headers(),
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Supabase upsert ${table}/${row.sync_id}: ${await response.text()}`
    );
  }
}

/* ============================================================
   LEGACY QUEUE SUPPORT
============================================================ */

function findSyncIdFromLegacyQueue(change) {
  if (!change.row_id) {
    return null;
  }

  try {
    const safeTable = quoteIdentifier(change.table_name);

    const row = db
      .prepare(
        `
        SELECT sync_id
        FROM ${safeTable}
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(change.row_id);

    return row?.sync_id || null;
  } catch {
    return null;
  }
}

/* ============================================================
   PUSH PENDING QUEUE
============================================================ */

async function pushPending() {
  const changes = db
    .prepare(
      `
      SELECT *
      FROM sync_queue
      WHERE processed_at IS NULL
      ORDER BY
        CASE table_name
          WHEN 'hospitals' THEN 1
          WHEN 'families' THEN 2
          WHEN 'patients' THEN 3
          WHEN 'visits' THEN 4
          WHEN 'medicines' THEN 5
          WHEN 'presets' THEN 6
          WHEN 'medicine_catalog' THEN 7
          WHEN 'fitness_certificates' THEN 8
          WHEN 'illness_certificates' THEN 9
          WHEN 'cash_receipts' THEN 10
          WHEN 'reference_letters' THEN 11
          WHEN 'form_definitions' THEN 12
          WHEN 'form_fields' THEN 13
          WHEN 'custom_field_values' THEN 14
          ELSE 99
        END,
        id
      LIMIT 100
      `
    )
    .all();

  let count = 0;

  for (const change of changes) {
    try {
      const syncId =
        change.row_sync_id ||
        findSyncIdFromLegacyQueue(change);

      if (!syncId) {
        throw new Error(
          `Queue item ${change.id} has no row_sync_id`
        );
      }

      if (change.operation === 'delete') {
        await pushDeletedRecord(
          change.table_name,
          syncId
        );
      } else {
        const row = getLocalRow(
          change.table_name,
          syncId
        );

        if (!row) {
          await pushDeletedRecord(
            change.table_name,
            syncId
          );
        } else {
          await pushRecord(
            change.table_name,
            row
          );
        }
      }

      db.prepare(
        `
        UPDATE sync_queue
        SET
          processed_at = CURRENT_TIMESTAMP,
          last_error = NULL,
          attempts = COALESCE(attempts, 0) + 1
        WHERE id = ?
        `
      ).run(change.id);

      count++;
    } catch (error) {
      db.prepare(
        `
        UPDATE sync_queue
        SET
          last_error = ?,
          attempts = COALESCE(attempts, 0) + 1
        WHERE id = ?
        `
      ).run(
        String(error.message || error),
        change.id
      );

      throw error;
    }
  }

  return count;
}

/* ============================================================
   TOMBSTONE
============================================================ */

async function pushDeletedRecord(table, syncId) {
  const response = await fetch(
    `${tableUrl(table)}?sync_id=eq.${encodeURIComponent(syncId)}`,
    {
      method: 'PATCH',
      headers: {
        ...headers(),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Supabase delete/tombstone ${table}/${syncId}: ${await response.text()}`
    );
  }
}
/* ============================================================
   INCREMENTAL PULL
   ============================================================ */

function getLastChangeId() {
  const row = db
    .prepare(`
      SELECT value
      FROM sync_state
      WHERE key = 'last_change_id'
      LIMIT 1
    `)
    .get();

  return Number(row?.value || 0);
}

function setLastChangeId(changeId) {
  db.prepare(`
    INSERT INTO sync_state (key, value)
    VALUES ('last_change_id', ?)
    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
  `).run(String(changeId));
}

async function getLatestCloudChangeId() {
  const response = await fetch(
    `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/sync_changes` +
      `?select=id` +
      `&or=(hospital_id.eq.${HOSPITAL_ID},hospital_id.is.null)` +
      `&order=id.desc` +
      `&limit=1`,
    {
      headers: headers(),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Supabase latest change id: ${await response.text()}`
    );
  }

  const rows = await response.json();

  return Number(rows[0]?.id || 0);
}

async function pullIncremental() {
  let lastChangeId = getLastChangeId();

  /*
   * Existing installations already completed a full pull.
   *
   * On the first incremental run we establish a baseline at the
   * current cloud change ID instead of replaying the entire history.
   */
  if (!lastChangeId) {
    const latestChangeId = await getLatestCloudChangeId();

    setLastChangeId(latestChangeId);

    return 0;
  }

  const changesResponse = await fetch(
    `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/sync_changes` +
      `?select=id,entity_type,entity_sync_id,operation,changed_at` +
      `&id=gt.${encodeURIComponent(lastChangeId)}` +
      `&or=(hospital_id.eq.${HOSPITAL_ID},hospital_id.is.null)` +
      `&order=id.asc` +
      `&limit=${CHANGE_BATCH_SIZE}`,
    {
      headers: headers(),
    }
  );

  if (!changesResponse.ok) {
    throw new Error(
      `Supabase sync_changes: ${await changesResponse.text()}`
    );
  }

  const changes = await changesResponse.json();

  if (changes.length === 0) {
    return 0;
  }

  let count = 0;

  /*
   * Cloud writes are protected from creating local sync_queue
   * feedback by sync_runtime.pulling.
   */
  db.prepare(`
    UPDATE sync_runtime
    SET value = '1'
    WHERE key = 'pulling'
  `).run();

  try {
    for (const change of changes) {
      if (!TABLES.includes(change.entity_type)) {
        lastChangeId = Number(change.id);
        continue;
      }

      if (!change.entity_sync_id) {
        lastChangeId = Number(change.id);
        continue;
      }

      const entityResponse = await fetch(
        `${tableUrl(change.entity_type)}` +
          `?select=*` +
          `&sync_id=eq.${encodeURIComponent(change.entity_sync_id)}` +
          `&limit=1`,
        {
          headers: headers(),
        }
      );

      if (!entityResponse.ok) {
        throw new Error(
          `Supabase changed row ${change.entity_type}/${change.entity_sync_id}: ` +
            await entityResponse.text()
        );
      }

      const rows = await entityResponse.json();

      /*
       * The change log points to a row that should normally still
       * exist because deletes are represented as tombstones.
       */
      if (rows.length > 0) {
        upsertLocalBySyncId(change.entity_type, rows[0]);

        db.prepare(`
          UPDATE sync_queue
          SET
            processed_at = CURRENT_TIMESTAMP,
            last_error = NULL
          WHERE table_name = ?
            AND row_sync_id = ?
        `).run(
          change.entity_type,
          change.entity_sync_id
        );

        count++;
      }

      /*
       * Advance the cursor only after this change has been
       * successfully processed.
       */
      lastChangeId = Number(change.id);
      setLastChangeId(lastChangeId);
    }
  } finally {
    db.prepare(`
      UPDATE sync_runtime
      SET value = '0'
      WHERE key = 'pulling'
    `).run();
  }

  return count;
} 
/* ============================================================
   LOCAL UPSERT
============================================================ */

function upsertLocalBySyncId(table, row) {
  const safeTable = quoteIdentifier(table);

  const localRow = { ...row };

  // NEVER allow Supabase integer ID to become
  // the SQLite integer primary key.
  delete localRow.id;

  // ----------------------------------------------------------
  // PATIENT -> FAMILY
  // ----------------------------------------------------------

  if (table === 'patients') {
    delete localRow.family_id;

    if (row.family_sync_id) {
      const family = getLocalRow(
        'families',
        row.family_sync_id
      );

      localRow.family_id = family
        ? family.id
        : null;
    } else {
      localRow.family_id = null;
    }
  }

  // ----------------------------------------------------------
  // VISIT -> PATIENT
  // ----------------------------------------------------------

  if (table === 'visits') {
    delete localRow.patient_id;

    if (row.patient_sync_id) {
      const patient = getLocalRow(
        'patients',
        row.patient_sync_id
      );

      localRow.patient_id = patient
        ? patient.id
        : null;
    } else {
      localRow.patient_id = null;
    }
  }

  // ----------------------------------------------------------
  // MEDICINE -> VISIT
  // ----------------------------------------------------------

  if (table === 'medicines') {
    delete localRow.visit_id;

    if (row.visit_sync_id) {
      const visit = getLocalRow(
        'visits',
        row.visit_sync_id
      );

      localRow.visit_id = visit
        ? visit.id
        : null;
    } else {
      localRow.visit_id = null;
    }
  }

  const existing = db
    .prepare(`
      SELECT id
      FROM ${safeTable}
      WHERE sync_id = ?
      LIMIT 1
    `)
    .get(row.sync_id);

  if (existing) {
    const columns = Object.keys(localRow);

    if (columns.length === 0) {
      return;
    }

    const assignments = columns
      .map(
        column =>
          `${quoteIdentifier(column)} = ?`
      )
      .join(', ');

    db.prepare(`
      UPDATE ${safeTable}
      SET ${assignments}
      WHERE id = ?
    `).run(
      ...columns.map(column => localRow[column]),
      existing.id
    );

    return;
  }

  const columns = Object.keys(localRow);

  if (columns.length === 0) {
    return;
  }

  const placeholders = columns
    .map(() => '?')
    .join(', ');

  db.prepare(`
    INSERT INTO ${safeTable}
      (${columns.map(quoteIdentifier).join(', ')})
    VALUES
      (${placeholders})
  `).run(
    ...columns.map(column => localRow[column])
  );
}

/* ============================================================
   MAIN SYNC
============================================================ */

async function runSync() {
  if (
    running ||
    !isOnlineMode() ||
    !isConfigured()
  ) {
    return getStatus();
  }

  running = true;

  lastError = null;
  lastPushCount = 0;
  lastPullCount = 0;

  try {
    /*
     * IMPORTANT:
     *
     * PUSH FIRST.
     *
     * This guarantees parents exist before children.
     */
    lastPushCount = await pushPending();

    /*
 * INCREMENTAL PULL
 *
 * Only changes recorded in Supabase sync_changes since the
 * previous successful cursor are downloaded.
 */
lastPullCount = await pullIncremental();

    lastRun = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO sync_state (key, value)
      VALUES ('last_success_at', ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
      `
    ).run(lastRun);

    db.prepare(
      `
      INSERT INTO sync_state (key, value)
      VALUES ('last_error', NULL)
      ON CONFLICT(key)
      DO UPDATE SET value = NULL
      `
    ).run();
  } catch (error) {
    lastError = String(
      error.message || error
    );

    db.prepare(
      `
      INSERT INTO sync_state (key, value)
      VALUES ('last_error', ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
      `
    ).run(lastError);
  } finally {
    running = false;
  }

  return getStatus();
}

/* ============================================================
   WORKER
============================================================ */

function startSyncWorker() {
  if (timer) {
    clearInterval(timer);
  }

  timer = setInterval(() => {
    runSync().catch(() => {});
  }, 10000);

  runSync().catch(() => {});
}

function stopSyncWorker() {
  if (timer) {
    clearInterval(timer);
  }

  timer = null;
}

/* ============================================================
   STATUS
============================================================ */

function getStatus() {
  const pending = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM sync_queue
      WHERE processed_at IS NULL
      `
    )
    .get().count;

  const mode =
    db
      .prepare(
        "SELECT value FROM app_settings WHERE key='data_mode'"
      )
      .get()?.value || 'offline';

  return {
    mode,
    configured: isConfigured(),
    running,
    pending: Number(pending),
    lastRun,
    lastError,
    lastPushCount,
    lastPullCount,
  };
}

module.exports = {
  startSyncWorker,
  stopSyncWorker,
  runSync,
  getStatus,
  isConfigured,
  isOnlineMode,
};