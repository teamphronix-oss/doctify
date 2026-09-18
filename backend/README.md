# Doctify Backend

Node.js + Express + SQLite (via Node's own **built-in** `node:sqlite`
module - no native binary to install or compile, which avoids a Windows
crash issue an earlier version of this hit with the `better-sqlite3`
package). Requires **Node.js 22+**. Every endpoint below was tested
end-to-end before this was handed to you.

You'll see a one-line warning on startup: `ExperimentalWarning: SQLite is
an experimental feature`. That's expected and harmless - `node:sqlite` is
newer than most Node features but stable enough for this use. The
`--experimental-sqlite` flag it needs is already baked into the npm
scripts (`npm start`, `npm run dev`, `npm run seed`) - you don't need to
type it yourself.

Covers all 5 modules from the old ASP.NET system, field-for-field:
**Patients** (with family-phone matching), **Visits/Prescriptions** (with
the full medicine builder), **Presets** and **Medicine Catalog** (now real
editable database tables, not hardcoded JS), **Certificates** (Fitness +
Illness), **Cash Receipts** (with a stubbed-out webhook endpoint ready for
a future payment gateway), and **Reference Letters**.

## Setup

```bash
npm install
npm run seed    # loads starter medicines + dosage presets
npm start       # runs on http://127.0.0.1:8123
```

For development with auto-reload on file changes: `npm run dev` instead of `npm start`.

A `dev.db` SQLite file appears automatically — that's your whole database,
no separate install needed for local dev. Delete it any time to start fresh
(then re-run `npm run seed`).

## Moving to Postgres later

Only `src/db/connection.js` needs to change — swap `better-sqlite3` for a
Postgres client (e.g. the `pg` package) and point it at your Postgres
connection string. The `schema.sql` file's structure (table names, columns)
stays the same, just written in Postgres-flavored SQL instead of SQLite's.
No route file needs to change.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/patients` | Add Patient |
| GET | `/patients?q=` | Patient Search (name or phone) - now includes each patient's last visit date + diagnosis |
| GET | `/patients/family-matches?phone=` | Family-link lookup — used on Add Patient |
| POST | `/patients/link-family` | Links a set of patient IDs into the same family (body: `{ "patientIds": [1, 2] }`) |
| GET | `/patients/:id` | Patient Details (includes linked family members) |
| DELETE | `/patients/:id` | Delete Patient (All Data) |
| POST | `/visits` | Preview & Save Prescription (vitals + history + medicines) |
| GET | `/visits/patient/:patientId` | Last Visit History for a patient |
| GET | `/visits/:id` | One visit, for Print Preview / Prescription Report |
| GET | `/presets?type=&language=` | Dosage instruction presets dropdown |
| POST | `/presets` | "+ Add New Preset" |
| GET | `/medicine-catalog?q=` | Medicine name autocomplete |
| POST | `/medicine-catalog` | Add a new medicine to the catalog |
| POST | `/certificates/fitness` | Add Fitness Certificate |
| GET | `/certificates/fitness` | List Fitness Certificates |
| POST | `/certificates/illness` | Add Illness Certificate |
| GET | `/certificates/illness` | List Illness Certificates |
| POST | `/cash-receipts` | Add Cash Receipt (now includes `description`) |
| GET | `/cash-receipts` | List Cash Receipts |
| POST | `/cash-receipts/gateway-webhook` | **Stub only** — see note below |
| POST | `/reference-letters` | Add Reference Letter (now includes `patient_name`, `referred_to`, `reason`, `urgency`) |
| GET | `/reference-letters` | List Reference Letters |

## Example: adding a full prescription

```bash
curl -X POST http://127.0.0.1:8123/visits -H "Content-Type: application/json" -d '{
  "patient_id": 1,
  "bp": "120/80", "pulse": "78", "diagnosis": "Viral fever",
  "follow_up_period": 5, "follow_up_unit": "Days",
  "medicines": [
    { "type": "Tablet", "name": "Calpol 650mg", "language": "mr-IN",
      "instructions": "1 गोळी सकाळी नाष्ट्यानंतर",
      "morning": true, "food_timing": "After", "quantity": 10 }
  ]
}'
```

## Not yet built (on purpose, discussed and deferred)

- **WhatsApp sending** — not started. Simple version (opens WhatsApp with
  a pre-filled message) is a frontend-only feature, no backend change
  needed. Full auto-send needs WhatsApp Business API (Twilio/Gupshup/
  AiSensy) — a real integration with its own setup, for later.
- **Payment gateway webhook** — the `/cash-receipts/gateway-webhook`
  endpoint exists as a stub (returns 501) with the real implementation
  commented out right there in `src/routes/cashReceipts.js`, ready to
  wire up once a gateway (e.g. Razorpay) is chosen. The `cash_receipts`
  table already has `payment_source` and `gateway_reference` columns
  ready for this.
- **Auth (hospital code / user code / PIN)** — not built yet, next
  priority after the frontend is wired to this backend.
- **Seed data is a representative sample**, not the full ~150 medicines /
  ~120 presets from the old system. See the comment at the top of
  `src/db/seed.js` for how to add the rest.

## Folder structure

```
src/
├── index.js              entrypoint - wires all routes together
├── db/
│   ├── schema.sql         the whole database structure, one file
│   ├── connection.js      opens the db, applies schema on startup
│   └── seed.js            loads starter medicines + presets
└── routes/
    ├── patients.js
    ├── visits.js           prescriptions + medicines
    ├── presets.js
    ├── medicineCatalog.js
    ├── certificates.js     fitness + illness
    ├── cashReceipts.js
    └── referenceLetters.js
```
