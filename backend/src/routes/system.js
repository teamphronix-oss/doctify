const express = require('express');
const router = express.Router();

const db = require('../db/connection');
const sync = require('../services/sync');
const {
  createFullBackup,
  getBackupPath,
} = require('../services/backup');

router.get('/data-mode', (req, res) => {
  const mode =
    db.prepare(
      "SELECT value FROM app_settings WHERE key='data_mode'"
    ).get()?.value || 'offline';

  res.json({ mode });
});

router.put('/data-mode', async (req, res) => {
  const mode = req.body?.mode;

  if (!['offline', 'online'].includes(mode)) {
    return res.status(400).json({
      error: "mode must be 'offline' or 'online'",
    });
  }

  if (mode === 'online' && !sync.isConfigured()) {
    return res.status(400).json({
      error:
        'Online mode is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend first.',
    });
  }

  db.prepare(`
    INSERT INTO app_settings(key,value,updated_at)
    VALUES ('data_mode',?,CURRENT_TIMESTAMP)
    ON CONFLICT(key)
    DO UPDATE SET
      value=excluded.value,
      updated_at=CURRENT_TIMESTAMP
  `).run(mode);

  if (mode === 'online') {
    sync.startSyncWorker();
    await sync.runSync();
  } else {
    sync.stopSyncWorker();
  }

  res.json(sync.getStatus());
});

router.get('/sync-status', (req, res) => {
  res.json(sync.getStatus());
});

router.post('/sync-now', async (req, res) => {
  if (!sync.isOnlineMode()) {
    return res.status(409).json({
      error: 'Data mode is offline',
    });
  }

  if (!sync.isConfigured()) {
    return res.status(400).json({
      error: 'Supabase is not configured',
    });
  }

  const status = await sync.runSync();

  res.json(status);
});

/*
 * Create a full SQLite backup.
 *
 * This backs up the entire local database, not only patients.
 */
router.post('/backup', async (req, res) => {
  try {
    const backup = await createFullBackup();

    res.json({
      fileName: backup.fileName,
      downloadUrl: `/system/backup/download/${encodeURIComponent(
        backup.fileName
      )}`,
      clinicName: backup.clinicName,
      databaseFileName: backup.databaseFileName,
      excelFileName: backup.excelFileName,
      pdfFileName: backup.pdfFileName,
    });
  } 
  catch (error) {
  console.error(
    '[BACKUP] Full backup failed:',
    error
  );

  return res.status(500).json({
    error: 'Failed to create full Doctify backup',
    details:
      process.env.NODE_ENV === 'production'
        ? undefined
        : error?.message || String(error),
  });
}
});

/*
 * Download a previously created backup.
 */
router.get('/backup/download/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;
    const backupPath = getBackupPath(fileName);

    if (!backupPath) {
      return res.status(400).json({
        error: 'Invalid backup file',
      });
    }

    res.download(backupPath, fileName, (error) => {
      if (error && !res.headersSent) {
        console.error('[BACKUP] Failed to download backup:', error);

        res.status(404).json({
          error: 'Backup not found',
        });
      }
    });
  } catch (error) {
    console.error('[BACKUP] Download error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to download backup',
      });
    }
  }
});

module.exports = router;