require('dotenv').config();
const express = require('express');
const cors = require('cors');

const requireAuth = require('./middleware/requireAuth');
const requireClinic = require('./middleware/requireClinic');
const requireDeviceAccess = require('./middleware/requireDeviceAccess');
const reportsRouter = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json({ limit: '3mb' }));

app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/clinics', requireAuth, require('./routes/clinics'));
app.use('/patients', requireAuth, requireClinic, require('./routes/patients'));
app.use('/visits', requireAuth, requireClinic, require('./routes/visits'));
app.use('/presets', requireAuth, requireClinic, require('./routes/presets'));
app.use('/medicine-catalog', requireAuth, requireClinic, require('./routes/medicineCatalog'));
app.use('/certificates', requireAuth, requireClinic, require('./routes/certificates'));
app.use('/cash-receipts', requireAuth, requireClinic, require('./routes/cashReceipts'));
app.use('/reference-letters', requireAuth, requireClinic, require('./routes/referenceLetters'));
app.use('/system', requireAuth, requireClinic, requireDeviceAccess, require('./routes/system'));

app.use('/reports', requireAuth, requireClinic, reportsRouter);

const sync = require('./services/sync');
sync.startSyncWorker();

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Doctify OPD backend is running' });
});

const PORT = process.env.PORT || 8123;
app.listen(PORT, () => {
  console.log(`Doctify backend running on http://127.0.0.1:${PORT}`);
});
