const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  createExcelExport,
  createPdfExport,
   getExportData,
  setExportHospital,
} = require('./doctorExport');

const db = require('../db/connection');

const dbPath = path.resolve(
  process.env.DATABASE_PATH || path.join(__dirname, '../../dev.db')
);

const backupDir = path.join(path.dirname(dbPath), 'backups');

function ensureBackupDir() {
  fs.mkdirSync(backupDir, { recursive: true });
}

function sanitizeFileName(value) {
  return String(value || 'Clinic')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'Clinic';
}

function formatDateForFileName(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const seconds = String(date.getSeconds()).padStart(2, '0');

return `${day}-${month}-${year}-${hours}-${minutes}-${seconds}-${ampm}`;
}

function getClinicName(hospitalId) {
  try {
    const hospital = db
      .prepare(`
        SELECT name
        FROM hospitals
        WHERE id = ?
      `)
      .get(hospitalId);

    return hospital?.name || 'Doctify Clinic';
  } catch {
    return 'Doctify Clinic';
  }
}

function getApplicationTables() {
  const rows = db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    .all();

  return rows.map((row) => row.name);
}

function getTableColumns(tableName) {
  return db
    .prepare(`PRAGMA table_info("${tableName.replace(/"/g, '""')}")`)
    .all();
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function readTable(tableName) {
  const safeTable = quoteIdentifier(tableName);

  return db
    .prepare(`SELECT * FROM ${safeTable}`)
    .all();
}

function getTableCount(tableName) {
  const safeTable = quoteIdentifier(tableName);

  return db
    .prepare(`SELECT COUNT(*) AS count FROM ${safeTable}`)
    .get()?.count || 0;
}

function isInternalTable(tableName) {
  return [
    'app_settings',
    'device_identity',
    'sync_queue',
    'sync_state',
    'sync_runtime',
  ].includes(tableName);
}

function humanizeColumnName(columnName) {
  const specialLabels = {
    name: 'Name',
    gender: 'Gender',
    age: 'Age',
    phone: 'Phone',
    address: 'Address',
    diagnosis: 'Diagnosis',
    complaints: 'Complaints',
    notes: 'Notes',
    suggestions: 'Suggestions',
    follow_up: 'Follow-up',
    followup: 'Follow-up',
    date: 'Date',
    visit_date: 'Visit Date',
    created_at: 'Created',
    amount: 'Amount',
    description: 'Description',
    medicine: 'Medicine',
    medicine_name: 'Medicine',
    dosage: 'Dosage',
    dose: 'Dose',
    frequency: 'Frequency',
    duration: 'Duration',
    instructions: 'Instructions',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    food: 'Food Timing',
    food_timing: 'Food Timing',
    temperature: 'Temperature',
    pulse: 'Pulse',
    spo2: 'SpO₂',
    weight: 'Weight',
    height: 'Height',
    bp: 'Blood Pressure',
    blood_pressure: 'Blood Pressure',
    referred_to: 'Referred To',
    reason: 'Reason',
    urgency: 'Urgency',
    start_date: 'Start Date',
    end_date: 'End Date',
    resume_date: 'Resume Date',
    certificate_type: 'Certificate Type',
    payment_source: 'Payment Source',
    amount_in_words: 'Amount in Words',
  };

  if (specialLabels[columnName]) {
    return specialLabels[columnName];
  }

  return String(columnName)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}
function createJsonMetadata(
  outputPath,
  clinicName,
  backupDate,
  tables,
  databaseFileName,
  excelFileName,
  pdfFileName
) {
  const summary = getBackupSummary(tables);

  const metadata = {
    application: 'Doctify OPD',
    backupType: 'full',
    createdAt: new Date().toISOString(),
    backupDate,
    clinicName,

    database: {
      fileName: databaseFileName,
      type: 'SQLite',
      purpose: 'Authoritative restore source',
    },

    exports: {
      excel: excelFileName,
      pdf: pdfFileName,
    },

    tables: summary,

    totalRecords: summary.reduce(
      (total, item) => total + Number(item.rows),
      0
    ),

    restoreNote:
      'Restore the SQLite database included in this backup package. Excel and PDF files are human-readable exports and are not intended to be used as restore sources.',
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
}

function getBackupSummary(tables) {
  const visibleTables = tables.filter(
    (tableName) =>
      !isInternalTable(tableName)
  );

  return visibleTables.map((tableName) => ({
    table: tableName,
    rows: getTableCount(tableName),
  }));
}

function copyDatabaseBackup(outputPath) {
  /*
   * SQLite VACUUM INTO creates a consistent database snapshot.
   */
  const escapedPath = outputPath.replace(/'/g, "''");

  db.exec(`VACUUM INTO '${escapedPath}'`);
}

async function createZipArchive(sourceDir, zipPath, folderName) {
  const { ZipArchive } = await import('archiver');

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    const fail = (error) => { if (!settled) { settled = true; reject(error); } };

    output.on('close', finish);
    output.on('error', fail);
    archive.on('error', fail);

    archive.pipe(output);
    archive.directory(sourceDir, folderName);
    archive.finalize();
  });
}

async function createFullBackup(hospitalId) {
  ensureBackupDir();

  // Excel/PDF parts of the backup are limited to this clinic's records.
  setExportHospital(hospitalId);

  const clinicName = getClinicName(hospitalId);
  const now = new Date();

  const readableDate =
    formatDateForFileName(now);

  const timestamp =
    now.toISOString().replace(/[:.]/g, '-');

  const safeClinicName =
    sanitizeFileName(clinicName);

  const packageName =
    `Doctify-Full-Backup-${safeClinicName}-${readableDate}`;

  const workDir = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'doctify-backup-'
    )
  );

  const packageDir = path.join(
    workDir,
    packageName
  );

  fs.mkdirSync(packageDir, {
    recursive: true,
  });

  const databaseFileName =
    `Doctify-Database-${safeClinicName}-${readableDate}.db`;

  const excelFileName =
    `Doctify-Data-${safeClinicName}-${readableDate}.xlsx`;

  const pdfFileName =
    `Doctify-Report-${safeClinicName}-${readableDate}.pdf`;

  const metadataFileName =
    'Backup-Information.json';

  const databasePath = path.join(
    packageDir,
    databaseFileName
  );

  const excelPath = path.join(
    packageDir,
    excelFileName
  );

  const pdfPath = path.join(
    packageDir,
    pdfFileName
  );

  const metadataPath = path.join(
    packageDir,
    metadataFileName
  );

  const zipFileName =
    `${packageName}.zip`;

  const zipPath = path.join(
    backupDir,
    zipFileName
  );

  try {
    const tables =
      getApplicationTables();

    /*
     * 1. Create authoritative SQLite snapshot.
     */
    copyDatabaseBackup(databasePath);

    /*
     * 2. Create human-readable Excel export.
     */
   createExcelExport(
    getExportData(), 
  excelPath,
  clinicName,
  now.toLocaleString()
);

    /*
     * 3. Create human-readable PDF report.
     */
  await createPdfExport(
    getExportData(),
  pdfPath,
  clinicName,
  now.toLocaleString()
);

    /*
     * 4. Create metadata.
     */
    createJsonMetadata(
      metadataPath,
      clinicName,
      now.toLocaleString(),
      tables,
      databaseFileName,
      excelFileName,
      pdfFileName
    );

    /*
     * 5. Package everything into ONE ZIP.
     */
   await createZipArchive(
  packageDir,
  zipPath,
  packageName
);

    return {
      fileName: zipFileName,
      backupPath: zipPath,
      clinicName,
      databaseFileName,
      excelFileName,
      pdfFileName,
      tables,
    };
  } finally {
    /*
     * Temporary working files are removed.
     * The ZIP remains in the permanent backup directory.
     */
    fs.rmSync(workDir, {
      recursive: true,
      force: true,
    });
  }
}

function getBackupPath(fileName) {
  if (!fileName) {
    return null;
  }

  if (path.basename(fileName) !== fileName) {
    return null;
  }

  if (
    !/^Doctify-Full-Backup-[A-Za-z0-9_-]+\.zip$/.test(
      fileName
    )
  ) {
    return null;
  }

  return path.join(
    backupDir,
    fileName
  );
}

function backupExists(fileName) {
  const backupPath =
    getBackupPath(fileName);

  return Boolean(
    backupPath &&
      fs.existsSync(backupPath) &&
      fs.statSync(backupPath).isFile()
  );
}

module.exports = {
  backupDir,
  createFullBackup,
  getBackupPath,
  backupExists,
};