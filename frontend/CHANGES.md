# Doctify Frontend — connected to the real backend

## Round 2: Certificates, Cash Receipts, Reference Letters

- **`src/screens/Certificate.tsx`** — rewritten. The old form only collected
  a generic "Details" text field, which didn't match your backend's real
  requirements (or the old ASP.NET system's actual fields). Now correctly
  collects Age, Gender, Examination Date, plus Fitness Type (Fitness certs)
  or Diagnosis + Start/End/Resume dates (Illness certs) — matching your
  original system field-for-field, wired to the real backend.
- **`src/screens/CashReceipt.tsx`** — wired to the backend. Backend gained
  a `description` column to match this screen's field (was missing).
- **`src/screens/ReferenceLetter.tsx`** — wired to the backend. Backend
  gained `patient_name`/`referred_to`/`reason`/`urgency` columns to match
  this screen's fields (the old backend only stored one generic text field,
  matching the old ASP.NET AddReference.aspx, which really did only have
  one field — this screen is more detailed, so the backend needed to catch up).
  Also removed a "Delete" button that only removed letters from the screen
  locally without actually deleting them from the database — misleading,
  so it's gone until a real delete endpoint exists.
- **`src/api/client.ts`** — added `listCertificates`/`addFitnessCertificate`/
  `addIllnessCertificate`, `listReceipts`/`addReceipt`,
  `listReferenceLetters`/`addReferenceLetter`.
- **`src/types.ts`** — `Certificate` type extended with the real fields
  (age, gender, fitnessType, diagnosis, startDate, endDate, resumeDate).

All four confirmed working via a full integration test before this was
handed back (create a Fitness cert, an Illness cert, a receipt with
description, a reference letter with all structured fields — every one
round-tripped through the real backend correctly).

## Round 1: Add Patient + Patient Search

This is your Figma Make frontend with **Add Patient** and **Patient
Search** wired to the real Node.js backend instead of mock data.
Tested end-to-end (TypeScript compiles clean, production build succeeds,
and a full integration test simulating the real user flow — add patient,
family match, link family, search, open — all passed) before this was
handed back to you.

### What changed

- **`src/api/client.ts`** (new file) — the only place that talks to the
  backend. Converts between the backend's data shape and the frontend's
  existing `Patient`/`Visit`/`Medicine` types, so no other screen needed
  to change.
- **`src/screens/AddPatient.tsx`** — the phone-number family lookup and
  "Save Prescription" now call the real backend. Also fixed a bug: the
  family-link radio buttons were matching on `familyId` (which doesn't
  exist yet for a brand-new match) — now correctly matches on patient ID.
- **`src/screens/PatientSearch.tsx`** — loads real patients from the
  backend, with loading/error states. Opening a patient fetches their
  full visit history first.
- Removed `pnpm-lock.yaml` — this project had both an npm and a pnpm
  lockfile; keeping both risked dependency drift. Since you're already
  using npm for the backend, that's the one kept here.

## Not yet wired (next steps, same pattern each time)

- **Dashboard** — still shows mock stats (Total Patients, Today's Visits,
  etc.). Needs a small backend endpoint to compute these from real data.
- **Login** — doesn't check real credentials yet (no auth built).
- Certificate/Cash Receipt/Reference Letter screens have no **edit** or
  **delete** yet — only create + list. Same pattern to add when needed:
  new backend route, new `api/client.ts` function, wire the button.

## Running it

```bash
npm install
npm run dev
```

**Requires the backend running at the same time**, on `http://127.0.0.1:8123`
(see the backend's own README). Open two terminals — one for `npm run dev`
here, one for `npm start` in the backend folder.

Add a patient, issue a certificate, log a receipt, write a reference
letter — refresh the page, they should all still be there. That's the
real, working proof.

