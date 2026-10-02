import type { Patient, Visit, Medicine, Certificate, Receipt, ReferenceLetter, Clinic } from '../types';

// Points at the backend from earlier. Change via a .env file
// (VITE_API_BASE=...) once this moves off your laptop.
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8123';

// ---------------------------------------------------------------------
// Login token
//
// The backend gives us a token on login. We keep it in sessionStorage
// (cleared when the browser tab is closed) and attach it to every request
// below. Change sessionStorage -> localStorage if you want doctors to stay
// logged in after closing the tab.
// ---------------------------------------------------------------------

const TOKEN_KEY = 'doctify_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Every fetch() in this file goes through this wrapper (it shadows the
// global fetch), so all API calls automatically send the token.
// If the backend says 401 (token missing/expired), we clear the token and
// tell the app to return to the login screen.
const fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await window.fetch(input, { ...init, headers });

  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event('doctify:unauthorized'));
  }

  return res;
};

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------
// Adapters: the backend speaks snake_case, flat rows (Postgres/SQLite
// style). The frontend types (types.ts) use camelCase and nest visits
// + medicines inside a patient. These functions are the ONLY place that
// bridges the two shapes, so every screen keeps working against the
// same Patient/Visit/Medicine types it already expects.
// ---------------------------------------------------------------------

function adaptMedicine(m: any): Medicine {
  return {
    id: String(m.id),
    type: m.type,
    name: m.name,
    language: m.language,
    instructions: m.instructions || '',
    morning: !!m.morning,
    afternoon: !!m.afternoon,
    night: !!m.night,
    timing: m.food_timing === 'After' ? 'After' : 'Before',
    quantity: m.quantity != null ? String(m.quantity) : '',
  };
}

function adaptVisit(v: any): Visit {
  return {
    id: String(v.id),
    date: (v.visit_date || '').slice(0, 10),
    vitals: {
      bp: v.bp || '', pulse: v.pulse || '', spo2: v.spo2 || '',
      weight: v.weight || '', height: v.height || '', temp: v.temp || '',
    },
    complaints: v.complaints || '',
    pastHistory: v.past_history || '',
    allergies: v.allergies || '',
    oe: v.oe || '',
    quickNote: v.quick_note || '',
    diagnosis: v.diagnosis || '',
    medicines: (v.medicines || []).map(adaptMedicine),
    suggestions: v.suggestions || '',
    investigations: v.investigations || '',
    opdMedicine: v.opd_medicine || '',
    followUp: v.follow_up_period != null ? String(v.follow_up_period) : '',
    followUpUnit: v.follow_up_unit || 'days',
    // Pharmacy connection is a planned future phase (discussed, not built
    // yet) - every visit shows as not-sent until that feature exists.
    pharmacyStatus: 'not-sent',
  };
}

function adaptPatientBase(p: any): Omit<Patient, 'visits'> {
  return {
    id: String(p.id),
    name: p.name,
    age: p.age ?? 0,
    gender: (p.gender as Patient['gender']) || 'Other',
    phone: p.phone || '',
    familyId: p.family_id != null ? String(p.family_id) : undefined,
    familyMembers: Array.isArray(p.familyMembers)
      ? p.familyMembers.map((member: any) => ({
          id: String(member.id),
          name: member.name,
          age: member.age ?? 0,
          gender: member.gender || '',
          phone: member.phone || '',
        }))
      : [],
  };
}

// Used for the Patient Search results list: the backend's GET /patients
// includes a summary of just the last visit (date + diagnosis), so we
// build a single synthetic Visit from that. This keeps PatientSearch's
// existing rendering code (which reads p.visits[p.visits.length - 1])
// working unchanged.
function adaptPatientForList(p: any): Patient {
  const base = adaptPatientBase(p);
  const visits: Visit[] = p.last_visit_date
    ? [{
        id: 'summary',
        date: (p.last_visit_date || '').slice(0, 10),
        vitals: { bp: '', pulse: '', spo2: '', weight: '', height: '', temp: '' },
        complaints: '', pastHistory: '', allergies: '', oe: '', quickNote: '',
        diagnosis: p.last_visit_diagnosis || '',
        medicines: [],
        suggestions: '', investigations: '', opdMedicine: '',
        followUp: '', followUpUnit: 'days',
        pharmacyStatus: 'not-sent',
      }]
    : [];
  return { ...base, visits };
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export interface LoginPayload {
  hospitalCode: string;
  userCode: string;
  pin: string;
}

// Shape the backend sends for a clinic (clinicService.js). id is numeric
// there; the rest of the frontend works with string ids (see Clinic).
interface ApiClinic {
  id: number;
  name: string;
  code: string;
  address: string;
  doctorName: string;
  qualification: string;
  regNo: string;
  role: string;
}

function adaptClinic(c: ApiClinic): Clinic {
  return {
    id: String(c.id),
    name: c.name,
    address: c.address || '',
    doctorName: c.doctorName || '',
    qualification: c.qualification || '',
    regNo: c.regNo || '',
    code: c.code,
    role: c.role,
  };
}

export interface LoginResult {
  userName: string;
  role: string;
  clinics: Clinic[];
  activeClinicId: string;
}

// On bad credentials or an inactive account, throws an Error whose message
// is the backend's plain-English reason (e.g. "Invalid hospital code, user
// code or PIN.") - the Login screen shows that message directly.
//
// hospitalCode picks exactly which clinic this login opens - the same
// user code + PIN work across every clinic this doctor belongs to, only
// the hospital code differs per clinic. (Switching to another of their
// clinics afterwards, without a new login, is selectClinic() below.)
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Login failed (${res.status}).`);
  }

  sessionStorage.setItem(TOKEN_KEY, data.token);

  return {
    userName: data.user.name,
    role: data.user.role,
    clinics: (data.clinics as ApiClinic[]).map(adaptClinic),
    activeClinicId: String(data.hospital.id),
  };
}

// ---------------------------------------------------------------------
// Clinics
// ---------------------------------------------------------------------

// All clinics the logged-in doctor can open.
export async function listClinics(): Promise<Clinic[]> {
  const rows = await handle(await fetch(`${API_BASE}/clinics`));
  return (rows as ApiClinic[]).map(adaptClinic);
}

export interface ClinicDetailsPayload {
  name: string;
  address?: string;
  doctorName?: string;
  qualification?: string;
  regNo?: string;
}

// Adds a brand-new clinic (the doctor becomes its owner). It starts
// completely empty - no patients, visits, etc. are shared with any
// other clinic.
export async function addClinic(details: ClinicDetailsPayload): Promise<Clinic> {
  const row = await handle(await fetch(`${API_BASE}/clinics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  }));
  return adaptClinic(row);
}

export async function updateClinic(id: string, details: ClinicDetailsPayload): Promise<Clinic> {
  const row = await handle(await fetch(`${API_BASE}/clinics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  }));
  return adaptClinic(row);
}

// Switches the active clinic WITHOUT logging out - only succeeds if the
// doctor actually belongs to that clinic. Every API call after this
// automatically uses the new clinic's data (the token carries it).
export async function selectClinic(hospitalId: string): Promise<Clinic> {
  const res = await fetch(`${API_BASE}/auth/select-clinic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId: Number(hospitalId) }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Could not switch clinic (${res.status}).`);
  }

  sessionStorage.setItem(TOKEN_KEY, data.token);

  return adaptClinic(data.clinic);
}

// ---------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------

export async function searchPatients(query = ''): Promise<Patient[]> {
  const url = query ? `${API_BASE}/patients?q=${encodeURIComponent(query)}` : `${API_BASE}/patients`;
  const rows = await handle(await fetch(url));
  return rows.map(adaptPatientForList);
}

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
}

export interface FamilySummary {
  id: string;
  label: string;
  memberCount: number;
  members: FamilyMember[];
}

// Search existing families by family name, member name, or member phone.
export async function searchFamilies(query = ''): Promise<FamilySummary[]> {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  return handle(await fetch(`${API_BASE}/patients/families${suffix}`));
}

export async function createFamily(label: string): Promise<FamilySummary> {
  return handle(await fetch(`${API_BASE}/patients/families`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  }));
}


export interface FamilyDetailsData {
  id: string;
  label: string;
  hospital_id?: number;
  memberCount: number;
  members: FamilyMember[];
}

export async function getFamily(id: string): Promise<FamilyDetailsData> {
  const data = await handle(await fetch(`${API_BASE}/patients/families/${id}`));

  return {
    id: String(data.id),
    label: data.label || `Family ${data.id}`,
    hospital_id: data.hospital_id,
    memberCount: Number(data.member_count ?? data.memberCount ?? 0),
    members: (data.members || []).map((member: any) => ({
      id: String(member.id),
      name: member.name,
      age: member.age ?? 0,
      gender: member.gender || '',
      phone: member.phone || '',
    })),
  };
}

export async function addFamilyMember(
  familyId: string,
  patientId: string
): Promise<void> {
  await handle(await fetch(`${API_BASE}/patients/families/${familyId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: Number(patientId) }),
  }));
}

export async function removeFamilyMember(
  familyId: string,
  patientId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/patients/families/${familyId}/members/${patientId}`,
    { method: 'DELETE' }
  );

  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
}

export async function renameFamily(
  familyId: string,
  label: string
): Promise<void> {
  await handle(await fetch(`${API_BASE}/patients/families/${familyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  }));
}

// Powers the "X existing family members found at this number" block
export async function findFamilyMatches(phone: string): Promise<Patient[]> {
  if (!phone) return [];
  const rows = await handle(await fetch(`${API_BASE}/patients/family-matches?phone=${encodeURIComponent(phone)}`));
  return rows.map((r: any) => ({ ...adaptPatientBase(r), visits: [] }));
}

// Full patient record with ALL visits + medicines (for Patient Details / Print Preview)
export async function getPatientFull(id: string): Promise<Patient> {
  const [patientRes, visitsRes] = await Promise.all([
    fetch(`${API_BASE}/patients/${id}`),
    fetch(`${API_BASE}/visits/patient/${id}`),
  ]);

  const patient = await handle(patientRes);
  const visits = await handle(visitsRes);

  const base = adaptPatientBase(patient);

  let family: FamilySummary | null = null;

  if (base.familyId) {
    try {
      family = await getFamily(base.familyId);
    } catch {
      family = null;
    }
  }

  return {
    ...base,
    family,
    familyMembers: base.familyMembers || family?.members.filter(
      member => member.id !== String(id)
    ) || [],
    visits: visits.map(adaptVisit),
  };
}

export interface NewPatientPayload {
  name: string;
  gender: string;
  age: string;
  phone: string;
  linkWithFamilyId?: string | null; // an existing family's id to add the new patient to
  visit: {
    bp: string; pulse: string; spo2: string; weight: string; height: string; temp: string;
    pastHistory: string; allergies: string; complaints: string; oe: string; quickNote: string; diagnosis: string;
    suggestions: string; investigations: string; opdMedicine: string;
    followUp: string; followUpUnit: string;
    medicines: Medicine[];
  };
}

// The full "Add Patient / New Prescription" save: creates the patient,
// links family if requested, creates the visit + all its medicines, then
// returns the assembled Patient (with the new visit attached) so the
// caller can navigate straight to Print Preview if it wants.
export async function createPatientWithVisit(payload: NewPatientPayload): Promise<Patient> {
  const patient = await handle(await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      gender: payload.gender,
      age: payload.age ? Number(payload.age) : null,
      phone: payload.phone,
    }),
  }));

  if (payload.linkWithFamilyId) {
    await handle(await fetch(`${API_BASE}/patients/link-family`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientIds: [patient.id], familyId: Number(payload.linkWithFamilyId) }),
    }));
  }

  const v = payload.visit;
  await handle(await fetch(`${API_BASE}/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: patient.id,
      bp: v.bp, pulse: v.pulse, spo2: v.spo2, weight: v.weight, height: v.height, temp: v.temp,
      past_history: v.pastHistory, allergies: v.allergies, complaints: v.complaints, oe: v.oe,
      quick_note: v.quickNote, diagnosis: v.diagnosis,
      suggestions: v.suggestions, investigations: v.investigations, opd_medicine: v.opdMedicine,
      follow_up_period: v.followUp ? Number(v.followUp) : null,
      follow_up_unit: v.followUpUnit,
      medicines: v.medicines.map((m) => ({
        type: m.type, name: m.name, language: m.language, instructions: m.instructions,
        morning: m.morning, afternoon: m.afternoon, night: m.night,
        food_timing: m.timing, quantity: m.quantity ? Number(m.quantity) : 1,
      })),
    }),
  }));

  return getPatientFull(String(patient.id));
}


export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
}

export async function createVisit(
  patientId: string,
  visit: NewPatientPayload['visit']
): Promise<Visit> {
  const result = await handle(await fetch(`${API_BASE}/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: Number(patientId),
      bp: visit.bp,
      pulse: visit.pulse,
      spo2: visit.spo2,
      weight: visit.weight,
      height: visit.height,
      temp: visit.temp,
      past_history: visit.pastHistory,
      allergies: visit.allergies,
      complaints: visit.complaints,
      oe: visit.oe,
      quick_note: visit.quickNote,
      diagnosis: visit.diagnosis,
      suggestions: visit.suggestions,
      investigations: visit.investigations,
      opd_medicine: visit.opdMedicine,
      follow_up_period: visit.followUp ? Number(visit.followUp) : null,
      follow_up_unit: visit.followUpUnit,
      medicines: visit.medicines.map(m => ({
        type: m.type,
        name: m.name,
        language: m.language,
        instructions: m.instructions,
        morning: m.morning,
        afternoon: m.afternoon,
        night: m.night,
        food_timing: m.timing,
        quantity: m.quantity ? Number(m.quantity) : 1,
      })),
    }),
  }));

  return adaptVisit(result);
}

// ---------------------------------------------------------------------
// Certificates (Fitness + Illness)
// ---------------------------------------------------------------------

function adaptFitnessCert(c: any): Certificate {
  return {
    id: `fitness-${c.id}`,
    type: 'Fitness',
    patientName: c.patient_name,
    age: c.age ?? undefined,
    gender: c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : undefined,
    date: (c.examination_date || '').slice(0, 10),
    fitnessType: c.fitness_type,
  };
}

function adaptIllnessCert(c: any): Certificate {
  return {
    id: `illness-${c.id}`,
    type: 'Illness',
    patientName: c.patient_name,
    age: c.age ?? undefined,
    gender: c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : undefined,
    date: (c.examination_date || '').slice(0, 10),
    diagnosis: c.diagnosis,
    startDate: (c.start_date || '').slice(0, 10),
    endDate: (c.end_date || '').slice(0, 10),
    resumeDate: c.resume_date ? c.resume_date.slice(0, 10) : undefined,
  };
}

export async function listCertificates(): Promise<Certificate[]> {
  const [fitness, illness] = await Promise.all([
    handle(await fetch(`${API_BASE}/certificates/fitness`)),
    handle(await fetch(`${API_BASE}/certificates/illness`)),
  ]);
  const all = [...fitness.map(adaptFitnessCert), ...illness.map(adaptIllnessCert)];
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface NewFitnessCertPayload {
  patientName: string; age?: string; gender?: string;
  examinationDate: string; fitnessType: string;
}
export async function addFitnessCertificate(p: NewFitnessCertPayload): Promise<Certificate> {
  const genderCode = p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : null;
  const c = await handle(await fetch(`${API_BASE}/certificates/fitness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: p.patientName, age: p.age ? Number(p.age) : null, gender: genderCode,
      examination_date: p.examinationDate, fitness_type: p.fitnessType,
    }),
  }));
  return adaptFitnessCert(c);
}

export interface NewIllnessCertPayload {
  patientName: string; age?: string; gender?: string; examinationDate: string;
  diagnosis: string; startDate: string; endDate: string; resumeDate?: string;
}
export async function addIllnessCertificate(p: NewIllnessCertPayload): Promise<Certificate> {
  const genderCode = p.gender === 'Male' ? 'M' : p.gender === 'Female' ? 'F' : null;
  const c = await handle(await fetch(`${API_BASE}/certificates/illness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: p.patientName, age: p.age ? Number(p.age) : null, gender: genderCode,
      examination_date: p.examinationDate, diagnosis: p.diagnosis,
      start_date: p.startDate, end_date: p.endDate, resume_date: p.resumeDate || null,
    }),
  }));
  return adaptIllnessCert(c);
}

// ---------------------------------------------------------------------
// Cash Receipts
// ---------------------------------------------------------------------

function adaptReceipt(r: any): Receipt {
  return {
    id: String(r.id),
    patientName: r.patient_name,
    date: (r.consult_date || '').slice(0, 10),
    amount: r.amount,
    description: r.description || '',
    receiptNo: `RCP-${String(r.id).padStart(4, '0')}`,
  };
}

export async function listReceipts(): Promise<Receipt[]> {
  const rows = await handle(await fetch(`${API_BASE}/cash-receipts`));
  return rows.map(adaptReceipt);
}

export interface NewReceiptPayload {
  patientName: string; amount: string; description?: string;
}
export async function addReceipt(p: NewReceiptPayload): Promise<Receipt> {
  const today = new Date().toISOString().slice(0, 10);
  const r = await handle(await fetch(`${API_BASE}/cash-receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: p.patientName, amount: Number(p.amount),
      description: p.description || null, consult_date: today,
    }),
  }));
  return adaptReceipt(r);
}

// ---------------------------------------------------------------------
// Reference Letters
// ---------------------------------------------------------------------

function adaptLetter(l: any): ReferenceLetter {
  return {
    id: String(l.id),
    patientName: l.patient_name || '',
    referredTo: l.referred_to || '',
    reason: l.reason || '',
    date: (l.created_at || '').slice(0, 10),
    urgency: (l.urgency as 'Routine' | 'Urgent') || 'Routine',
  };
}

export async function listReferenceLetters(): Promise<ReferenceLetter[]> {
  const rows = await handle(await fetch(`${API_BASE}/reference-letters`));
  return rows.map(adaptLetter);
}

export interface NewLetterPayload {
  patientName: string; referredTo: string; reason?: string; urgency: string;
}
export async function addReferenceLetter(p: NewLetterPayload): Promise<ReferenceLetter> {
  // reference_text is the backend's required summary field - build it from
  // the structured fields so the old system's single-text-field storage
  // still gets a sensible value alongside the new structured columns.
  const referenceText = `Patient ${p.patientName} referred to ${p.referredTo}.${p.reason ? ` Reason: ${p.reason}` : ''}`;
  const l = await handle(await fetch(`${API_BASE}/reference-letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_name: p.patientName, referred_to: p.referredTo,
      reason: p.reason || null, urgency: p.urgency, reference_text: referenceText,
    }),
  }));
  return adaptLetter(l);
}

export interface Preset {
  id: number; medicine_type: string; language: string; label: string;
  morning: number; afternoon: number; night: number; food_timing: string;
}
export async function listPresets(type: string, language: string): Promise<Preset[]> {
  return handle(await fetch(`${API_BASE}/presets?type=${encodeURIComponent(type)}&language=${encodeURIComponent(language)}`));
}

export interface CatalogMedicine { id: number; name: string; type: string }
export async function listMedicineCatalog(): Promise<CatalogMedicine[]> {
  return handle(await fetch(`${API_BASE}/medicine-catalog`));
}

export async function addMedicineCatalog(
  medicine: { name: string; type: string; hospital_id?: string | null }
): Promise<CatalogMedicine> {
  return handle(await fetch(`${API_BASE}/medicine-catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medicine),
  }));
}

export async function deleteMedicineCatalog(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/medicine-catalog/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
}

export async function addPreset(
  preset: {
    medicine_type: string;
    language: string;
    label: string;
    morning: number | boolean;
    afternoon: number | boolean;
    night: number | boolean;
    food_timing: string;
    hospital_id?: string | null;
  }
): Promise<Preset> {
  return handle(await fetch(`${API_BASE}/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset),
  }));
}

export async function deletePreset(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/presets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
}

// ---------------------------------------------------------------------
// Data mode / cloud sync controls
// ---------------------------------------------------------------------

export type DataMode = 'offline' | 'online';

export interface SyncStatus {
  mode: DataMode;
  configured: boolean;
  running: boolean;
  pending: number;
  lastRun: string | null;
  lastError: string | null;
  lastPushCount: number;
  lastPullCount: number;
}

export async function getDataMode(): Promise<DataMode> {
  const data = await handle(
    await fetch(`${API_BASE}/system/data-mode`)
  );

  return data.mode === 'online' ? 'online' : 'offline';
}

export async function setDataMode(mode: DataMode): Promise<SyncStatus> {
  return handle(
    await fetch(`${API_BASE}/system/data-mode`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode }),
    })
  );
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return handle(
    await fetch(`${API_BASE}/system/sync-status`)
  );
}

export async function syncNow(): Promise<SyncStatus> {
  return handle(
    await fetch(`${API_BASE}/system/sync-now`, {
      method: 'POST',
    })
  );
}

// ---------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------

export interface ReportsSummary {
  period: {
    from: string;
    to: string;
  };

  opd: {
    patients: number;
    visits: number;
    newPatients: number;
    followUps: number;
  };

  revenue: {
    receipts: number;
    total: number;
  };

  documents: {
    fitnessCertificates: number;
    illnessCertificates: number;
    referenceLetters: number;
  };

  daily: Array<{
    date: string;
    visits: number;
    patients: number;
  }>;
}

export async function getReportsSummary(
  from: string,
  to: string
): Promise<ReportsSummary> {
  const params = new URLSearchParams({
    from,
    to,
  });

  return handle(
    await fetch(`${API_BASE}/reports/summary?${params.toString()}`)
  );
}
// =====================================================================
// Reports — record-based export data
// Add this to frontend/src/api/client.ts
// =====================================================================

export interface DashboardSummary {
  totalPatients: number;

  todayPatients: Array<{
    id: number;
    name: string;
    age: number | null;
    gender: string | null;
    phone: string | null;
    visit_date: string;
    diagnosis: string | null;
  }>;

  opd: {
    patients: number;
    visits: number;
    newPatients: number;
    followUps: number;
  };

  revenue: {
    receipts: number;
    total: number;
  };
}

export async function getDashboardSummary(
  date: string
): Promise<DashboardSummary> {
  return handle(
    await fetch(`${API_BASE}/reports/summary?from=${date}&to=${date}`)
  );
}


export async function createBackup(): Promise<{
  fileName: string;
  downloadUrl: string;
}> {
  return handle(
    await fetch(`${API_BASE}/system/backup`, {
      method: 'POST',
    })
  );
}
export async function createBackupAndDownload(): Promise<{
  fileName: string;
}> {
  const response = await fetch(
    `${API_BASE}/system/backup`,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');

    throw new Error(
      `Backup failed (${response.status}): ${
        body || 'Unknown error'
      }`
    );
  }

  const backup: {
    fileName: string;
    downloadUrl: string;
    clinicName: string;
    databaseFileName: string;
    excelFileName: string;
    pdfFileName: string;
  } = await response.json();

  /*
   * Download the complete ZIP package.
   */
  const downloadResponse = await fetch(
    `${API_BASE}${backup.downloadUrl}`
  );

  if (!downloadResponse.ok) {
    throw new Error(
      'Backup was created but could not be downloaded.'
    );
  }

  const blob =
    await downloadResponse.blob();

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;
  link.download = backup.fileName;

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.URL.revokeObjectURL(url);

  return {
    fileName: backup.fileName,
  };
}
export async function deleteAllPatientData(
  backupFileName: string
): Promise<{
  deletedPatients: number;
}> {
  const response = await fetch(`${API_BASE}/patients/all`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      backupFileName,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');

    throw new Error(
      `Delete all failed (${response.status}): ${
        body || 'Unknown error'
      }`
    );
  }

  return response.json();
}
export interface MonthlyReportData {
  period: {
    from: string;
    to: string;
  };

  patientReport: Array<{
    id: number;
    patientId: number;
    date: string;
    patientName: string;
    phone: string;
    age: number | string;
    gender: string;
    visitType: string;
  }>;

  illnessReport: Array<{
    id: number;
    patientName: string;
    age: number | string;
    gender: string;
    examinationDate: string;
    diagnosis: string;
    startDate: string;
    endDate: string;
    resumeDate: string;
  }>;

  cashReceiptReport: Array<{
    id: number;
    receiptNo: string;
    patientName: string;
    date: string;
    description: string;
    amount: number;
  }>;

  fitnessReport: Array<{
    id: number;
    patientName: string;
    age: number | string;
    gender: string;
    examinationDate: string;
    fitnessType: string;
  }>;

  referenceLetterReport: Array<{
    id: number;
    patientName: string;
    date: string;
    referredTo: string;
    reason: string;
    urgency: string;
  }>;
}

export async function getMonthlyReport(
  from: string,
  to: string
): Promise<MonthlyReportData> {
  const params = new URLSearchParams({ from, to });

  return handle(
    await fetch(`${API_BASE}/reports/monthly?${params.toString()}`)
  );
}


