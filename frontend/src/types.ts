export type Screen =
  | 'login'
  | 'clinic-select'
  | 'dashboard'
  | 'add-patient'
  | 'patient-search'
  | 'patient-details'
  | 'families'
  | 'family-details'
  | 'print-preview'
  | 'certificate'
  | 'cash-receipt'
  | 'reference-letter'
  | 'medical-certificates'
  | 'settings'
  | 'reports';

export interface User {
  name: string;
  role: string;
  clinics: Clinic[];
  activeClinic: Clinic;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  doctorName: string;
  qualification: string;
  regNo: string;
  code?: string;   // the clinic's login code (shown so it can be shared/noted down)
  role?: string;   // this user's role in this clinic (e.g. 'owner', 'doctor')
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

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  familyId?: string;
  family?: FamilySummary | null;
  familyMembers?: FamilyMember[];
  visits: Visit[];
}

export interface Visit {
  id: string;
  date: string;
  vitals: Vitals;
  complaints: string;
  pastHistory: string;
  allergies: string;
  oe: string;
  quickNote: string;
  diagnosis: string;
  medicines: Medicine[];
  suggestions: string;
  investigations: string;
  opdMedicine: string;
  followUp: string;
  followUpUnit: string;
  pharmacyStatus: 'not-sent' | 'sent' | 'dispensed';
}

export interface Vitals {
  bp: string;
  pulse: string;
  spo2: string;
  weight: string;
  height: string;
  temp: string;
}

export interface Medicine {
  id: string;
  type: string;
  name: string;
  language: string;
  instructions: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  timing: 'Before' | 'After';
  quantity: string;
}

export interface Certificate {
  id: string;
  type: 'Fitness' | 'Illness';
  patientName: string;
  age?: number;
  gender?: 'Male' | 'Female';
  date: string; // examination date
  // Fitness-only
  fitnessType?: 'Duty' | 'Work' | 'School' | 'Sport';
  // Illness-only
  diagnosis?: string;
  startDate?: string;
  endDate?: string;
  resumeDate?: string;
}


export interface ReferenceLetter {
  id: string;
  patientName: string;
  referredTo: string;
  reason: string;
  date: string;
  urgency: 'Routine' | 'Urgent';
}

export interface Receipt {
  id: string;
  patientName: string;
  date: string;
  amount: number;
  description: string;
  receiptNo: string;
}
