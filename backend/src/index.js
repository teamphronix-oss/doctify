require('dotenv').config();
const express = require('express');
const cors = require('cors');

const reportsRouter = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/patients', require('./routes/patients'));
app.use('/visits', require('./routes/visits'));
app.use('/presets', require('./routes/presets'));
app.use('/medicine-catalog', require('./routes/medicineCatalog'));
app.use('/certificates', require('./routes/certificates'));
app.use('/cash-receipts', require('./routes/cashReceipts'));
app.use('/reference-letters', require('./routes/referenceLetters'));
app.use('/system', require('./routes/system'));

app.use('/reports', reportsRouter);

const sync = require('./services/sync');
sync.startSyncWorker();

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Doctify OPD backend is running' });
});

const PORT = process.env.PORT || 8123;
app.listen(PORT, () => {
  console.log(`Doctify backend running on http://127.0.0.1:${PORT}`);
});
