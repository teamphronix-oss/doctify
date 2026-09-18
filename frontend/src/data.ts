import type { Patient, Certificate, Receipt, Clinic, ReferenceLetter, User } from './types';

export const CLINICS: Clinic[] = [
  {
    id: 'c1',
    name: 'Shri Ganesh Clinic',
    address: 'Shop No. 4, Ganesh Nagar, Pune - 411014',
    doctorName: 'Dr. Rajesh Patil',
    qualification: 'MBBS, MD (Medicine)',
    regNo: 'MH-PMC-34521',
  },
  {
    id: 'c2',
    name: 'City Care Medical Centre',
    address: '12, MG Road, Nashik - 422001',
    doctorName: 'Dr. Rajesh Patil',
    qualification: 'MBBS, MD (Medicine)',
    regNo: 'MH-PMC-34521',
  },
];

export const DEFAULT_USER: User = {
  name: 'Dr. Rajesh Patil',
  role: 'Doctor / Admin',
  clinics: CLINICS,
  activeClinic: CLINICS[0],
};

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Sunita Deshmukh',
    age: 42,
    gender: 'Female',
    phone: '9876543210',
    familyId: 'f1',
    visits: [
      {
        id: 'v1',
        date: '2026-08-14',
        vitals: { bp: '130/85', pulse: '78', spo2: '98', weight: '62', height: '158', temp: '37.2' },
        complaints: 'Headache, mild fever since 2 days',
        pastHistory: 'Hypertension - 3 years',
        allergies: 'Penicillin',
        oe: 'Throat mildly congested. No lymphadenopathy.',
        quickNote: 'Follow-up for BP control',
        diagnosis: 'Viral fever with hypertension',
        medicines: [
          { id: 'm1', type: 'Tablet', name: 'Paracetamol 500mg', language: 'Marathi', instructions: 'तापाकरिता', morning: true, afternoon: true, night: true, timing: 'After', quantity: '15' },
          { id: 'm2', type: 'Tablet', name: 'Amlodipine 5mg', language: 'Marathi', instructions: 'रक्तदाबाकरिता', morning: true, afternoon: false, night: false, timing: 'Before', quantity: '5' },
        ],
        suggestions: 'Rest, plenty of fluids',
        investigations: 'CBC, BP monitoring daily',
        opdMedicine: 'ORS sachets',
        followUp: '5', followUpUnit: 'days',
        pharmacyStatus: 'sent',
      },
    ],
  },
  {
    id: 'p2',
    name: 'Ramesh Deshmukh',
    age: 48,
    gender: 'Male',
    phone: '9876543210',
    familyId: 'f1',
    visits: [
      {
        id: 'v2',
        date: '2026-08-10',
        vitals: { bp: '140/90', pulse: '82', spo2: '97', weight: '78', height: '170', temp: '36.8' },
        complaints: 'Chest tightness, shortness of breath on exertion',
        pastHistory: 'Hypertension, Type 2 Diabetes',
        allergies: 'None known',
        oe: 'CVS - S1 S2 normal. Lungs - clear.',
        quickNote: '',
        diagnosis: 'Hypertensive heart disease - stable',
        medicines: [
          { id: 'm3', type: 'Tablet', name: 'Telmisartan 40mg', language: 'Marathi', instructions: 'रक्तदाबाकरिता', morning: true, afternoon: false, night: false, timing: 'Before', quantity: '30' },
        ],
        suggestions: 'Low salt diet, daily walk 30 mins',
        investigations: 'ECG, Echo, HbA1c',
        opdMedicine: '',
        followUp: '1', followUpUnit: 'month',
        pharmacyStatus: 'dispensed',
      },
    ],
  },
  {
    id: 'p3',
    name: 'Priya Kulkarni',
    age: 28,
    gender: 'Female',
    phone: '9823456780',
    visits: [
      {
        id: 'v3',
        date: '2026-08-15',
        vitals: { bp: '110/70', pulse: '72', spo2: '99', weight: '55', height: '162', temp: '37.0' },
        complaints: 'Cough with expectoration since 5 days',
        pastHistory: 'Asthma (childhood)',
        allergies: 'Dust, cold air',
        oe: 'Lungs - mild wheeze bilateral. No crepitations.',
        quickNote: 'Inhaler technique reviewed',
        diagnosis: 'Acute bronchitis, exacerbation of asthma',
        medicines: [
          { id: 'm4', type: 'Syrup', name: 'Ambroxol 30mg', language: 'English', instructions: 'For cough', morning: true, afternoon: true, night: true, timing: 'After', quantity: '1 bottle' },
          { id: 'm5', type: 'Inhaler', name: 'Salbutamol MDI', language: 'English', instructions: 'As needed', morning: false, afternoon: false, night: false, timing: 'Before', quantity: '1' },
        ],
        suggestions: 'Avoid cold exposure, steam inhalation',
        investigations: 'Chest X-ray, Spirometry if no improvement',
        opdMedicine: 'Levocetrizine 5mg',
        followUp: '3', followUpUnit: 'days',
        pharmacyStatus: 'not-sent',
      },
    ],
  },
  {
    id: 'p4',
    name: 'Ganesh Pawar',
    age: 65,
    gender: 'Male',
    phone: '9765432109',
    visits: [
      {
        id: 'v4',
        date: '2026-08-13',
        vitals: { bp: '150/95', pulse: '88', spo2: '96', weight: '72', height: '165', temp: '37.4' },
        complaints: 'Joint pain both knees, difficulty climbing stairs',
        pastHistory: 'Osteoarthritis, Diabetes mellitus',
        allergies: 'NSAIDs (GI upset)',
        oe: 'Knees - crepitus present. No effusion. ROM restricted.',
        quickNote: 'Physiotherapy referral given',
        diagnosis: 'Osteoarthritis bilateral knees - Grade II',
        medicines: [
          { id: 'm6', type: 'Tablet', name: 'Diacerhein 50mg', language: 'Marathi', instructions: 'सांधेदुखीकरिता', morning: false, afternoon: false, night: true, timing: 'After', quantity: '30' },
        ],
        suggestions: 'Knee exercises, weight reduction',
        investigations: 'X-ray knees AP/lateral, Vitamin D levels',
        opdMedicine: '',
        followUp: '1', followUpUnit: 'month',
        pharmacyStatus: 'not-sent',
      },
    ],
  },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  { id: 'cert1', type: 'Fitness', patientName: 'Priya Kulkarni', date: '2026-08-15', fitnessType: 'School' },
  { id: 'cert2', type: 'Illness', patientName: 'Ramesh Deshmukh', date: '2026-08-10', diagnosis: 'Viral fever', startDate: '2026-08-10', endDate: '2026-08-13' },
  { id: 'cert3', type: 'Fitness', patientName: 'Sunita Deshmukh', date: '2026-07-28', fitnessType: 'Work' },
];

export const MOCK_REFERENCE_LETTERS: ReferenceLetter[] = [
  {
    id: 'l1',
    patientName: 'Ramesh Deshmukh',
    referredTo: 'Dr. Sunil Mehta, Cardiologist',
    reason: 'Hypertensive heart disease evaluation, Echo required',
    date: '2026-08-10',
    urgency: 'Routine',
  },
  {
    id: 'l2',
    patientName: 'Ganesh Pawar',
    referredTo: 'Deenanath Mangeshkar Hospital, Orthopaedics',
    reason: 'Bilateral knee OA Grade II — surgical opinion',
    date: '2026-08-13',
    urgency: 'Routine',
  },
];

export const MOCK_RECEIPTS: Receipt[] = [
  { id: 'r1', patientName: 'Sunita Deshmukh', date: '2026-08-14', amount: 300, description: 'OPD Consultation', receiptNo: 'RCP-0041' },
  { id: 'r2', patientName: 'Ramesh Deshmukh', date: '2026-08-10', amount: 500, description: 'OPD Consultation + ECG', receiptNo: 'RCP-0040' },
  { id: 'r3', patientName: 'Priya Kulkarni', date: '2026-08-15', amount: 300, description: 'OPD Consultation', receiptNo: 'RCP-0042' },
  { id: 'r4', patientName: 'Ganesh Pawar', date: '2026-08-13', amount: 400, description: 'OPD Consultation + X-Ray', receiptNo: 'RCP-0039' },
];

export const MEDICINE_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Inhaler', 'Injection', 'Cream', 'Drops', 'Sachet', 'Patch'];
export const LANGUAGES = ['Marathi', 'Hindi', 'English'];
export const FOLLOW_UP_UNITS = ['days', 'weeks', 'months'];
