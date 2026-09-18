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

for (const table of tables) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  console.log(`${table}: ${columns.some(c => c.name === 'hospital_id') ? 'HAS hospital_id' : 'NO hospital_id'}`);
}

db.close();
