// Loads starter data into medicine_catalog and presets, based on the
// exact data from your old ASP.NET system (medicines.data.js and the
// DEFAULTS object in AddPatient.aspx).
//
// NOTE: this is a representative sample of each category, not a full
// transcription of all ~150 medicines and ~120 presets from the old
// files - that's mechanical copy-paste work, not something worth
// spending review time on here. Add the rest the same way: either run
// more INSERT statements following this exact pattern, or write a tiny
// script that reads your old medicines.data.js array directly and loops
// through it calling POST /medicine-catalog for each entry.
//
// Run with: node src/db/seed.js
require('dotenv').config();
const db = require('./connection');
const DEFAULTS = require('./prescription-defaults');

const medicines = [
  { name: "Aciloc RD", type: "Tablet" },
            { name: "Angicam M", type: "Tablet" },
            { name: "Atarax 10mg", type: "Tablet" },
            { name: "Atarax 25mg", type: "Tablet" },
            { name: "Augmentin Duo 625mg", type: "Tablet" },
            { name: "Azisat 250mg", type: "Tablet" },
            { name: "Azisat 500mg", type: "Tablet" },
            { name: "Bandy", type: "Tablet" },
            { name: "Bandy Plus", type: "Tablet" },
            { name: "Bandy Plus 12", type: "Tablet" },
            { name: "Becozyme C Forte", type: "Tablet" },
            { name: "Beplex forte", type: "Tablet" },
            { name: "Bendex", type: "Tablet" },
            { name: "Brufen 400mg", type: "Tablet" },

            { name: "Betavert OD 24mg", type: "Tablet" },
            { name: "Bisoheart 2.5mg", type: "Tablet" },
            { name: "Bisoheart 5mg", type: "Tablet" },
            { name: "Bisoheart AM 2.5", type: "Tablet" },
            { name: "Bisoheart AM 5", type: "Tablet" },
            { name: "Bisoheart T 2.5mg", type: "Tablet" },
            { name: "Bisoheart T 5mg", type: "Tablet" },
            { name: "Blumox Plus", type: "Tablet" },
            { name: "Calpol", type: "Tablet" },
            { name: "Calpol 650mg", type: "Tablet" },
            { name: "Cepodem 100mg", type: "Tablet" },
            { name: "Cepodem 200mg", type: "Tablet" },
            { name: "Cherical", type: "Tablet" },
            { name: "Cilniblu 10mg", type: "Tablet" },
            { name: "Cilniblu 5mg", type: "Tablet" },
            { name: "Cilniblu T", type: "Tablet" },
            { name: "Deriphyllin R 150mg", type: "Tablet" },
            { name: "Diabiz 10mg", type: "Tablet" },
            { name: "Diabiz 5mg", type: "Tablet" },
            { name: "Diabiz M", type: "Tablet" },
            { name: "Diabiz M Forte", type: "Tablet" },
            { name: "Diapar", type: "Tablet" },
            { name: "Dynaglipt L 5 mg", type: "Tablet" },
            { name: "Dynaglipt LM (2.5+500)", type: "Tablet" },
            { name: "Dynaglipt LM(2.5+1gm)", type: "Tablet" },
            { name: "Dynaglipt LM (5+500)", type: "Tablet" },
            { name: "Dynaglipt LM (5+1gm)", type: "Tablet" },
            { name: "DynaDuo 10", type: "Tablet" },
            { name: "Ecosprin AV 75mg", type: "Tablet" },
            { name: "Emsita MSR 500mg", type: "Tablet" },
            { name: "Emsita MSR 1gm", type: "Tablet" },
            { name: "Emsita Trio (10+100+500)", type: "Tablet" },
            { name: "Emsita Trio Forte (10+100+1gm)", type: "Tablet" },
            { name: "Febrex Plus", type: "Tablet" },
            { name: "Flex 150mg", type: "Tablet" },
            { name: "Flucoril", type: "Tablet" },
            { name: "Glycomet SR 500mg", type: "Tablet" },
            { name: "Glycomet SR 1gm", type: "Tablet" },
            { name: "Histafree M", type: "Tablet" },
            { name: "Histafree 120mg", type: "Tablet" },
            { name: "ITflex 130mg", type: "Tablet" },
            { name: "Jalra OD 100mg", type: "Tablet" },
            { name: "Kifer", type: "Tablet" },
            { name: "Levoflox 250mg", type: "Tablet" },
            { name: "Levoflox 500mg", type: "Tablet" },
            { name: "Levolin 1mg", type: "Tablet" },
            { name: "Livogen", type: "Tablet" },
            { name: "Macfast", type: "Tablet" },
            { name: "Meni 8mg", type: "Tablet" },
            { name: "Meni 16mg", type: "Tablet" },
            { name: "Meryl Plus", type: "Tablet" },
            { name: "Metrogyl 400mg", type: "Tablet" },
            { name: "Monet LC", type: "Tablet" },
            { name: "Moxifirce CV 625mg", type: "Tablet" },
            { name: "Moxikind CV 625mg", type: "Tablet" },
            { name: "Mycal D", type: "Tablet" },
            { name: "Neomercazol 5mg", type: "Tablet" },
            { name: "Neomercazol 10mg", type: "Tablet" },
            { name: "Nebi 2.5mg", type: "Tablet" },
            { name: "Nebi 5mg", type: "Tablet" },
            { name: "Neurokind Plus", type: "Tablet" },
            { name: "Okabion Plus", type: "Tablet" },
            { name: "Paintrol 650mg", type: "Tablet" },
            { name: "Polyclav DS 457mg", type: "Tablet" },
            { name: "Prugo 10mg", type: "Tablet" },
            { name: "Prugo 25mg", type: "Tablet" },
            { name: "Rabenova 20mg", type: "Tablet" },
            { name: "Rabekind 20mg", type: "Tablet" },
            { name: "Ranidom O", type: "Tablet" },
            { name: "Rifakem 200mg", type: "Tablet" },
            { name: "Rinifol", type: "Tablet" },
            { name: "Rovastat 5mg", type: "Tablet" },
            { name: "Rovastat 10mg", type: "Tablet" },
            { name: "Sporlac DS", type: "Tablet" },
            { name: "Telmikind 20mg", type: "Tablet" },
            { name: "Telmikind 40mg", type: "Tablet" },
            { name: "Telmikind AM", type: "Tablet" },
            { name: "Telmikind AMH", type: "Tablet" },
            { name: "Teneblu DM", type: "Tablet" },
            { name: "Teneblu M", type: "Tablet" },
            { name: "Teneblu M Forte", type: "Tablet" },
            { name: "Troycobal NT", type: "Tablet" },
            { name: "Ultracet", type: "Tablet" },
            { name: "Ultracet Semi", type: "Tablet" },
            { name: "Vertin 8mg", type: "Tablet" },
            { name: "Vertin 16mg", type: "Tablet" },
            { name: "Wikovax", type: "Tablet" },
            { name: "Wikoryl", type: "Tablet" },
            { name: "Xtan 40mg", type: "Tablet" },
            { name: "Xtan AM", type: "Tablet" },
            { name: "Xtan AMH", type: "Tablet" },
            { name: "Zyloric 100mg", type: "Tablet" },
            { name: "Zerodol P ", type: "Tablet" },
            { name: "Zerodol SP", type: "Tablet" },

            // ============================
            // SYRUPS
            // ============================
            { name: "Augmentin DDS", type: "Syrup" },
            { name: "Augmentin Duo", type: "Syrup" },
            { name: "Bandy", type: "Syrup" },
            { name: "Bendex", type: "Syrup" },
            { name: "Biocold", type: "Syrup" },
            { name: "Brozedex", type: "Syrup" },
            { name: "Cocof DC", type: "Syrup" },
            { name: "Cyclopam", type: "Syrup" },
            { name: "Duphalac", type: "Syrup" },
            { name: "Febrex Plus", type: "Syrup" },
            { name: "Febrex Plus DS", type: "Syrup" },
            { name: "Fincof", type: "Syrup" },
            { name: "Inderal 10mg", type: "Syrup" },
            { name: "Inderal LA 20mg ", type: "Syrup" },
            { name: "Inderal LA 40mg", type: "Syrup" },
            { name: "Kofstem D", type: "Syrup" },
            { name: "Meftal P", type: "Syrup" },
            { name: "Metrogyl", type: "Syrup" },
            { name: "Moxiforce CV", type: "Syrup" },
            { name: "Moxiforce CV Forte", type: "Syrup" },
            { name: "Moxikind CV", type: "Syrup" },
            { name: "Moxikind CV Forte", type: "Syrup" },
            { name: "Mucomin DC", type: "Syrup" },
            { name: "Oflomac", type: "Syrup" },
            { name: "Oflomac Forte", type: "Syrup" },
            { name: "Oflomac M", type: "Syrup" },
            { name: "Oflomac M Forte", type: "Syrup" },
            { name: "Omitus AM", type: "Syrup" },
            { name: "Paincold", type: "Syrup" },
            { name: "Pan MPS O", type: "Syrup" },
            { name: "Pazocain gel", type: "Syrup" },
            { name: "Pantakind Raft", type: "Syrup" },
            { name: "Rinifol", type: "Syrup" },
            { name: "Softee", type: "Syrup" },
            { name: "Softee Plus", type: "Syrup" },
            { name: "Thyronorm 12.5 mcg ", type: "Syrup" },
            { name: "Thyronorm 25 mcg ", type: "Syrup" },
            { name: "Thyronorm 37.5 mcg", type: "Syrup" },
            { name: "Thyronorm 50 mcg ", type: "Syrup" },
            { name: "Thyronorm 62.5 mcg ", type: "Syrup" },
            { name: "Thyronorm 75 mcg ", type: "Syrup" },
            { name: "Thyronorm 88 mcg ", type: "Syrup" },
            { name: "Thyronorm 100 mcg ", type: "Syrup" },
            { name: "Thyronorm 112 mcg ", type: "Syrup" },
            { name: "Thyronorm 125 mcg ", type: "Syrup" },
            { name: "Thyronorm 137 mcg", type: "Syrup" },
            { name: "Thyronorm 150 mcg", type: "Syrup" },
            { name: "Tusq DX", type: "Syrup" },
            { name: "Wikoryl", type: "Syrup" },
            { name: "Wikoryl DS", type: "Syrup" },
            { name: "Zyrcold", type: "Syrup" },

            // ============================
            // CAPSULES
            // ============================
            { name: "Becosule", type: "Capsule" },
            { name: "Blumox Plus", type: "Capsule" },
            { name: "Ecosprin AV 75mg", type: "Capsule" },
            { name: "Mego XL", type: "Capsule" },
            { name: "Minicyclin 100mg", type: "Capsule" },
            { name: "Nudoxy 100mg", type: "Capsule" },
            { name: "Okabion Plus", type: "Capsule" },
            { name: "Pan D", type: "Capsule" },
            { name: "R RD", type: "Capsule" },
            { name: "Rabenova DSR", type: "Capsule" },
            { name: "Rinifol", type: "Capsule" },

            // ============================
            // NASAL SPRAY / SACHET
            // ============================
            { name: "Neuronlife MD3", type: "Nasal Spray" },
            { name: "Mecobis SL", type: "Nasal Spray" },
            { name: "Naso B12 nasal spray", type: "Nasal Spray" },
            { name: "Sporlac sachet", type: "Nasal Spray" },

            // ============================
            // CREAMS
            // ============================
            { name: "Bitadine Cream", type: "Cream" },
            { name: "Fucidine cream", type: "Cream" },
            { name: "Muriact Cream", type: "Cream" },
            { name: "Nobel DS gel", type: "Cream" }
];

const presets = [];

// ============================================================
// LOAD ALL NORMAL PRESETS FROM OLD .NET DEFAULTS
// ============================================================

for (const [medicineType, languages] of Object.entries(DEFAULTS)) {
  for (const [language, items] of Object.entries(languages)) {

    for (const preset of items || []) {
      presets.push({
        medicine_type: medicineType,
        language: language,
        label: preset.label,
        morning: preset.m ? 1 : 0,
        afternoon: preset.a ? 1 : 0,
        night: preset.n ? 1 : 0,
        food_timing: preset.food
      });
    }

  }
}
// ============================================================
// SYRUP PRESETS
// Same logic as the old .NET application
// ============================================================

const syrupVolumes = [
  2,
  2.5,
  3.5,
  4,
  5,
  6,
  6.5,
  7.5,
  10,
  15
];

const syrupText = {
  'mr-IN': {
    tds: 'ml दिवसातून तीन वेळा',
    bid: 'ml सकाळी-संध्याकाळी',
    night: 'ml रोज रात्री'
  },

  'en-IN': {
    tds: 'ml three times a day',
    bid: 'ml morning-evening',
    night: 'ml at night only'
  },

  'hi-IN': {
    tds: 'ml दिन में तीन बार',
    bid: 'ml सुबह-शाम',
    night: 'ml रात में'
  }
};

for (const language of ['mr-IN', 'en-IN', 'hi-IN']) {

  for (const volume of syrupVolumes) {

    // Three times a day
    presets.push({
      medicine_type: 'Syrup',
      language: language,
      label: `${volume} ${syrupText[language].tds}`,
      morning: 1,
      afternoon: 1,
      night: 1,
      food_timing: 'After'
    });

    // Morning + evening
    presets.push({
      medicine_type: 'Syrup',
      language: language,
      label: `${volume} ${syrupText[language].bid}`,
      morning: 1,
      afternoon: 0,
      night: 1,
      food_timing: 'After'
    });

    // Night only
    presets.push({
      medicine_type: 'Syrup',
      language: language,
      label: `${volume} ${syrupText[language].night}`,
      morning: 0,
      afternoon: 0,
      night: 1,
      food_timing: 'After'
    });

  }
}

const insertMed = db.prepare(`
  INSERT INTO medicine_catalog (name, type)
  SELECT ?, ?
  WHERE NOT EXISTS (
    SELECT 1
    FROM medicine_catalog
    WHERE name = ? AND type = ?
  )
`);

const insertPreset = db.prepare(`
  INSERT INTO presets (
    medicine_type,
    language,
    label,
    morning,
    afternoon,
    night,
    food_timing
  )
  SELECT ?, ?, ?, ?, ?, ?, ?
  WHERE NOT EXISTS (
    SELECT 1
    FROM presets
    WHERE medicine_type = ?
      AND language = ?
      AND label = ?
  )
`);

let medicinesAdded = 0;

for (const m of medicines) {
  const result = insertMed.run(
    m.name,
    m.type,
    m.name,
    m.type
  );

  medicinesAdded += Number(result.changes || 0);
}

let presetsAdded = 0;

for (const p of presets) {
  const result = insertPreset.run(
    p.medicine_type,
    p.language,
    p.label,
    p.morning,
    p.afternoon,
    p.night,
    p.food_timing,
    p.medicine_type,
    p.language,
    p.label
  );

  presetsAdded += Number(result.changes || 0);
}

const medicineCount = db
  .prepare('SELECT COUNT(*) AS count FROM medicine_catalog')
  .get().count;

const presetCount = db
  .prepare('SELECT COUNT(*) AS count FROM presets')
  .get().count;

console.log(`Added ${medicinesAdded} new medicines.`);
console.log(`Added ${presetsAdded} new presets.`);
console.log(`Total medicines in database: ${medicineCount}`);
console.log(`Total presets in database: ${presetCount}`);