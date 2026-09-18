
import { deletePatient, getPatientFull } from '../api/client';
import { useState } from 'react';
import type { Patient, Screen, Visit } from '../types';
import { MOCK_PATIENTS } from '../data';
import { Card, Badge, Button, PageHeader } from '../components/ui';

interface PatientDetailsProps {
  patient: Patient | null;
  onNavigate: (screen: Screen, data?: unknown) => void;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatLongDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function InfoItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  if (!value) return null;

  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div
        className="text-[11px] font-semibold uppercase tracking-wide mb-1"
        style={{ color: '#8AA0B0' }}
      >
        {label}
      </div>
      <div
        className="text-sm leading-6 whitespace-pre-wrap"
        style={{ color: '#243746' }}
      >
        {value}
      </div>
    </div>
  );
}

function VitalCard({
  label,
  value,
  unit,
}: {
  label: string;
  value?: string;
  unit: string;
}) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: '#F7FAFC',
        border: '1px solid #E4EDF3',
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: '#8AA0B0' }}
      >
        {label}
      </div>
      <div
        className="text-lg font-bold mt-1"
        style={{ color: '#183247' }}
      >
        {value || '—'}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: '#9AAFBF' }}>
        {unit}
      </div>
    </div>
  );
}

function VisitCard({
  visit,
  defaultOpen,
  isLatest,
}: {
  visit: Visit;
  defaultOpen: boolean;
  isLatest: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const diagnosis = visit.diagnosis?.trim();
  const pharmacyColor =
    visit.pharmacyStatus === 'dispensed'
      ? 'green'
      : visit.pharmacyStatus === 'sent'
        ? 'blue'
        : 'gray';

  const pharmacyLabel =
    visit.pharmacyStatus === 'dispensed'
      ? 'Dispensed'
      : visit.pharmacyStatus === 'sent'
        ? 'Sent to pharmacy'
        : 'Not sent';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: isLatest ? '1px solid #B9DFF0' : '1px solid #E3EDF3',
        background: '#fff',
        boxShadow: isLatest ? '0 4px 18px rgba(33,150,201,0.08)' : 'none',
      }}
    >
      <button
        type="button"
        className="w-full text-left px-5 py-4"
        style={{
          background: open ? '#F8FBFD' : '#fff',
          borderBottom: open ? '1px solid #E5EEF4' : 'none',
        }}
        onClick={() => setOpen(value => !value)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isLatest ? '#E7F5FB' : '#F1F5F8',
                color: isLatest ? '#2196C9' : '#718797',
              }}
            >
              <svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-bold"
                  style={{ color: '#183247' }}
                >
                  {formatLongDate(visit.date)}
                </span>
                {isLatest && <Badge variant="blue">Latest visit</Badge>}
                <Badge variant={pharmacyColor}>{pharmacyLabel}</Badge>
              </div>

              <div className="text-xs mt-1 truncate" style={{ color: '#718797' }}>
                {diagnosis || 'No diagnosis recorded'}
                {visit.medicines.length > 0
                  ? ` · ${visit.medicines.length} medicine${visit.medicines.length === 1 ? '' : 's'}`
                  : ''}
              </div>
            </div>
          </div>

          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#F1F5F8', color: '#718797' }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <VitalCard label="BP" value={visit.vitals.bp} unit="mmHg" />
            <VitalCard label="Pulse" value={visit.vitals.pulse} unit="bpm" />
            <VitalCard label="SpO₂" value={visit.vitals.spo2} unit="%" />
            <VitalCard label="Weight" value={visit.vitals.weight} unit="kg" />
            <VitalCard label="Height" value={visit.vitals.height} unit="cm" />
            <VitalCard label="Temperature" value={visit.vitals.temp} unit="°C" />
          </div>

          <div
            className="rounded-xl p-4 mb-5"
            style={{
              background: '#FBFCFD',
              border: '1px solid #E7EEF3',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#E8F4FA', color: '#2196C9' }}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="text-sm font-bold" style={{ color: '#183247' }}>
                Clinical Information
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoItem label="Chief Complaints" value={visit.complaints} />
              <InfoItem label="Diagnosis" value={visit.diagnosis} />
              <InfoItem label="Past History" value={visit.pastHistory} />
              <InfoItem label="Known Allergies" value={visit.allergies} />
              <InfoItem label="On Examination" value={visit.oe} />
              <InfoItem label="Suggestions" value={visit.suggestions} />
              <InfoItem label="Investigations" value={visit.investigations} />
              <InfoItem label="OPD Medicine" value={visit.opdMedicine} />
              <InfoItem label="Follow-up" value={visit.followUp ? `After ${visit.followUp} ${visit.followUpUnit}` : undefined} />
              <InfoItem label="Quick Note" value={visit.quickNote} />
            </div>
          </div>

          {visit.medicines.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold" style={{ color: '#183247' }}>
                    Prescription
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#8AA0B0' }}>
                    {visit.medicines.length} medicine{visit.medicines.length === 1 ? '' : 's'} prescribed
                  </div>
                </div>
                <Badge variant="blue">Rx</Badge>
              </div>

              <div className="flex flex-col gap-2">
                {visit.medicines.map((medicine, index) => (
                  <div
                    key={medicine.id}
                    className="rounded-xl p-4"
                    style={{
                      border: '1px solid #E4EDF3',
                      background: '#fff',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: '#F0F6FA', color: '#2196C9' }}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: '#183247' }}>
                              {medicine.name}
                            </span>
                            <Badge variant="gray">{medicine.type}</Badge>
                          </div>
                          <div className="text-xs mt-1" style={{ color: '#5A7080' }}>
                            {medicine.instructions || 'No instructions recorded'}
                          </div>
                        </div>
                      </div>

                      <div
                        className="text-xs font-semibold whitespace-nowrap px-2.5 py-1 rounded-lg"
                        style={{ background: '#F5F8FA', color: '#5A7080' }}
                      >
                        {medicine.quantity || '—'} qty
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 ml-11">
                      <span
                        className="text-[11px] rounded-md px-2 py-1"
                        style={{ background: '#F0F6FA', color: '#5A7080' }}
                      >
                        {medicine.morning ? 'Morning' : 'No morning'}
                      </span>
                      <span
                        className="text-[11px] rounded-md px-2 py-1"
                        style={{ background: '#F0F6FA', color: '#5A7080' }}
                      >
                        {medicine.afternoon ? 'Afternoon' : 'No afternoon'}
                      </span>
                      <span
                        className="text-[11px] rounded-md px-2 py-1"
                        style={{ background: '#F0F6FA', color: '#5A7080' }}
                      >
                        {medicine.night ? 'Night' : 'No night'}
                      </span>
                      <span
                        className="text-[11px] rounded-md px-2 py-1"
                        style={{ background: '#EAF7F0', color: '#1A8B55' }}
                      >
                        {medicine.timing} food
                      </span>
                      {medicine.language && (
                        <span
                          className="text-[11px] rounded-md px-2 py-1"
                          style={{ background: '#F5F0FA', color: '#7955A6' }}
                        >
                          {medicine.language === 'mr-IN'
                            ? 'Marathi'
                            : medicine.language === 'hi-IN'
                              ? 'Hindi'
                              : 'English'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientDetails({
  patient,
  onNavigate,
}: PatientDetailsProps) {
  const p = patient ?? MOCK_PATIENTS[0];

  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const family = p.family ?? null;
  const familyMembers = p.familyMembers ?? [];

  const latestVisit = p.visits[0];

  const handleDeletePatient = async () => {
    setDeleting(true);

    try {
      await deletePatient(p.id);
      onNavigate('patient-search');
    } catch {
      setDeleting(false);
      window.alert('Could not delete this patient. Please try again.');
    }
  };

  const handleWhatsApp = () => {
    const rawPhone = (p.phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      window.alert('This patient does not have a valid phone number.');
      return;
    }

    if (!latestVisit) {
      window.alert('This patient has no prescription to send.');
      return;
    }

    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const lines = [
      `Prescription - ${p.name}`,
      `Date: ${latestVisit.date}`,
      latestVisit.diagnosis ? `Diagnosis: ${latestVisit.diagnosis}` : '',
      latestVisit.medicines.length ? 'Medicines:' : '',
      ...latestVisit.medicines.map((m, i) => {
        const dose = [m.morning ? 'M' : '', m.afternoon ? 'A' : '', m.night ? 'N' : '']
          .filter(Boolean).join('/');
        const timing = m.timing ? ` ${m.timing.toLowerCase()} food` : '';
        const qty = m.quantity ? ` · Qty ${m.quantity}` : '';
        return `${i + 1}. ${m.name} - ${m.instructions || dose}${timing}${qty}`;
      }),
      latestVisit.suggestions ? `Advice: ${latestVisit.suggestions}` : '',
      latestVisit.investigations ? `Investigations: ${latestVisit.investigations}` : '',
      latestVisit.followUp ? `Follow-up: ${latestVisit.followUp} ${latestVisit.followUpUnit}` : '',
      '',
      'Please follow the prescription as advised by the doctor.',
    ].filter(Boolean);

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ padding: '28px 32px', background: '#F3F8FB' }}
    >
      <PageHeader
        title="Patient Details"
        subtitle="Complete patient profile, clinical history and prescriptions"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => onNavigate('patient-search')}
              icon={
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              }
            >
              Back
            </Button>

            <Button
              variant="primary"
              onClick={() => onNavigate('add-patient', p)}
              icon={
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              Add Visit
            </Button>

            <Button
              variant="success"
              onClick={() => onNavigate('print-preview', p)}
              icon={
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
                </svg>
              }
            >
              Print
            </Button>

            <Button
              variant="secondary"
              onClick={handleWhatsApp}
              disabled={!p.phone || !latestVisit}
              icon={
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 11.5a8.1 8.1 0 0 1-8.1 8.1c-1.3 0-2.6-.3-3.7-.9L4 20l1.3-4.1a8.1 8.1 0 1 1 14.7-4.4z" />
                  <path d="M8.8 8.7c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.5.6c.6 1 1.3 1.7 2.3 2.2l.6-.5c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.6v.5c0 .3-.1.5-.5.7-.4.2-1 .2-1.5.1-2.7-.7-4.9-2.9-5.6-5.6-.1-.5-.1-1.1.1-1.5z" />
                </svg>
              }
            >
              WhatsApp
            </Button>

            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Patient identity */}
      <Card
        className="p-6 mb-4"
        style={{
          border: '1px solid #DDEAF1',
          boxShadow: '0 4px 18px rgba(30,70,95,0.05)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{
                width: 68,
                height: 68,
                background: 'linear-gradient(135deg, #2196C9, #147EAC)',
              }}
            >
              {p.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold" style={{ color: '#183247' }}>
                  {p.name}
                </h2>
                {family && (
                  <button
                    type="button"
                    onClick={() => onNavigate('family-details', family.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
                    style={{
                      background: '#E6F5EE',
                      color: '#1A8B55',
                      border: '1px solid #CFE9DB',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#D8F1E4';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#E6F5EE';
                    }}
                  >
                    {family.label}
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-2">
                <span className="text-sm" style={{ color: '#5A7080' }}>
                  {p.age} years · {p.gender}
                </span>

                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: '#5A7080' }}
                >
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {p.phone}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-[390px]">
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: '#F7FAFC', border: '1px solid #E4EDF3' }}
            >
              <div className="text-[11px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                Visits
              </div>
              <div className="text-lg font-bold mt-1" style={{ color: '#183247' }}>
                {p.visits.length}
              </div>
            </div>

            <div
              className="rounded-xl px-4 py-3"
              style={{ background: '#F7FAFC', border: '1px solid #E4EDF3' }}
            >
              <div className="text-[11px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                Last Visit
              </div>
              <div className="text-sm font-bold mt-1" style={{ color: '#183247' }}>
                {latestVisit ? formatDate(latestVisit.date) : '—'}
              </div>
            </div>

            <div
              className="rounded-xl px-4 py-3"
              style={{ background: '#F7FAFC', border: '1px solid #E4EDF3' }}
            >
              <div className="text-[11px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                Family
              </div>
              <div className="text-sm font-bold mt-1 truncate" style={{ color: '#183247' }}>
                {family?.label || 'Not linked'}
              </div>
            </div>
          </div>
        </div>

        {familyMembers.length > 0 && (
          <div
            className="mt-5 pt-5"
            style={{ borderTop: '1px solid #E7EEF3' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold" style={{ color: '#183247' }}>
                  Family Members
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8AA0B0' }}>
                  {familyMembers.length} other member{familyMembers.length === 1 ? '' : 's'} in this family
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {familyMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={async () => {
                    try {
                      const fullPatient = await getPatientFull(member.id);
                      onNavigate('patient-details', fullPatient);
                    } catch {
                      window.alert('Could not open this family member.');
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors"
                  style={{
                    background: '#F5FBF8',
                    border: '1px solid #D6EDE1',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#E9F7F0';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F5FBF8';
                  }}
                >
                  <div
                    className="rounded-full w-8 h-8 flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: '#1FA563', fontSize: 11, fontWeight: 700 }}
                  >
                    {member.name[0]?.toUpperCase()}
                  </div>

                  <div>
                    <div className="text-xs font-semibold" style={{ color: '#183247' }}>
                      {member.name}
                    </div>
                    <div className="text-[11px]" style={{ color: '#7C919F' }}>
                      {member.age ? `${member.age} years` : 'Age not recorded'} · {member.gender}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Latest visit highlight */}
      {latestVisit && (
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: 'linear-gradient(135deg, #EAF6FB 0%, #F7FBFD 100%)',
            border: '1px solid #C9E6F2',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: '#2196C9' }}
              >
                Most Recent Visit
              </div>
              <div className="text-lg font-bold mt-1" style={{ color: '#183247' }}>
                {formatLongDate(latestVisit.date)}
              </div>
              <div className="text-sm mt-1" style={{ color: '#5A7080' }}>
                {latestVisit.diagnosis || 'No diagnosis recorded'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {latestVisit.medicines.length > 0 && (
                <div
                  className="rounded-xl px-3 py-2"
                  style={{ background: '#fff', border: '1px solid #D8EAF2' }}
                >
                  <div className="text-[10px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                    Medicines
                  </div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: '#183247' }}>
                    {latestVisit.medicines.length}
                  </div>
                </div>
              )}

              {latestVisit.followUp && (
                <div
                  className="rounded-xl px-3 py-2"
                  style={{ background: '#fff', border: '1px solid #D8EAF2' }}
                >
                  <div className="text-[10px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                    Follow-up
                  </div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: '#183247' }}>
                    {latestVisit.followUp} {latestVisit.followUpUnit}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visit history */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-base font-bold" style={{ color: '#183247' }}>
            Visit History
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8AA0B0' }}>
            Newest visits appear first
          </div>
        </div>

        {p.visits.length > 0 && (
          <Badge variant="gray">
            {p.visits.length} total visit{p.visits.length === 1 ? '' : 's'}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3 pb-6">
        {p.visits.length === 0 ? (
          <Card className="py-12 text-center">
            <div
              className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: '#EAF4F9', color: '#2196C9' }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="text-sm font-semibold" style={{ color: '#183247' }}>
              No visits recorded
            </div>
            <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>
              Add the patient's first visit to start the clinical history.
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => onNavigate('add-patient', p)}>
                Add First Visit
              </Button>
            </div>
          </Card>
        ) : (
          p.visits.map((visit, index) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              defaultOpen={index === 0}
              isLatest={index === 0}
            />
          ))
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{
            background: 'rgba(15,33,51,0.55)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <Card className="p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: '#FDEEEE',
                  color: '#DC3545',
                }}
              >
                <svg
                  width={21}
                  height={21}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                </svg>
              </div>

              <div>
                <div className="text-base font-bold" style={{ color: '#183247' }}>
                  Delete patient record?
                </div>
                <div className="text-sm mt-1 leading-5" style={{ color: '#718797' }}>
                  This permanently deletes <strong>{p.name}</strong>, including all recorded visits and prescriptions. This action cannot be undone.
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                className="flex-1"
                disabled={deleting}
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await handleDeletePatient();
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Patient'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
