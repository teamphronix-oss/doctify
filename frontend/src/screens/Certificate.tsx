import { useEffect, useState } from 'react';
import type { Certificate } from '../types';
import { listCertificates, addFitnessCertificate, addIllnessCertificate } from '../api/client';
import { Card, Button, Input, Select, PageHeader, Badge } from '../components/ui';

const today = () => new Date().toISOString().slice(0, 10);

export default function CertificateScreen() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'Fitness' | 'Illness' | 'All'>('All');

  // Shared fields
  const [type, setType] = useState<'Fitness' | 'Illness'>('Fitness');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [examinationDate, setExaminationDate] = useState(today());

  // Fitness-only
  const [fitnessType, setFitnessType] = useState('');

  // Illness-only
  const [diagnosis, setDiagnosis] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [resumeDate, setResumeDate] = useState('');

  const load = () => {
    setLoading(true);
    listCertificates()
      .then(setCerts)
      .catch(() => setError('Could not reach the backend.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = activeTab === 'All' ? certs : certs.filter(c => c.type === activeTab);

  const resetForm = () => {
    setPatientName(''); setAge(''); setGender('');
    setExaminationDate(today()); setFitnessType('');
    setDiagnosis(''); setStartDate(today()); setEndDate(today()); setResumeDate('');
  };

  const canSave = type === 'Fitness'
    ? patientName.trim() && examinationDate && fitnessType
    : patientName.trim() && examinationDate && diagnosis.trim() && startDate && endDate;

  const handleAdd = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (type === 'Fitness') {
        await addFitnessCertificate({ patientName, age, gender, examinationDate, fitnessType });
      } else {
        await addIllnessCertificate({ patientName, age, gender, examinationDate, diagnosis, startDate, endDate, resumeDate });
      }
      resetForm();
      setShowForm(false);
      load();
    } catch {
      setError('Failed to save certificate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ padding: '28px 32px' }}>
      <PageHeader
        title="Medical Certificates"
        subtitle="Fitness and illness certificates issued to patients"
        actions={
          <Button variant="primary" onClick={() => setShowForm(s => !s)} icon={
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          }>
            {showForm ? 'Cancel' : 'New Certificate'}
          </Button>
        }
      />

      {showForm && (
        <Card className="p-5 mb-5">
          <div className="text-sm font-semibold mb-4" style={{ color: '#1A2B3C' }}>Issue New Certificate</div>

          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '160px 1fr 100px 140px 1fr' }}>
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value as 'Fitness' | 'Illness')}
              options={[{ value: 'Fitness', label: 'Fitness Certificate' }, { value: 'Illness', label: 'Illness Certificate' }]}
            />
            <Input label="Patient Name *" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" />
            <Input label="Age" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Age" />
            <Select
              label="Gender"
              value={gender}
              onChange={e => setGender(e.target.value)}
              options={[{ value: '', label: '-- Select --' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
            />
            <Input label="Examination Date *" type="date" value={examinationDate} onChange={e => setExaminationDate(e.target.value)} />
          </div>

          {type === 'Fitness' ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: '260px auto' }}>
              <Select
                label="Fitness Type *"
                value={fitnessType}
                onChange={e => setFitnessType(e.target.value)}
                options={[
                  { value: '', label: '-- Select --' },
                  { value: 'Duty', label: 'Duty' },
                  { value: 'Work', label: 'Work' },
                  { value: 'School', label: 'School' },
                  { value: 'Sport', label: 'Sport' },
                ]}
              />
              <div className="flex items-end">
                <Button variant="success" onClick={handleAdd} disabled={!canSave || saving}>
                  {saving ? 'Saving...' : 'Issue'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr' }}>
              <Input label="Diagnosis *" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnosis" />
              <div className="grid gap-4" style={{ gridTemplateColumns: '160px 160px 160px auto' }}>
                <Input label="From *" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <Input label="To *" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                <Input label="Resume Duties On" type="date" value={resumeDate} onChange={e => setResumeDate(e.target.value)} />
                <div className="flex items-end">
                  <Button variant="success" onClick={handleAdd} disabled={!canSave || saving}>
                    {saving ? 'Saving...' : 'Issue'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: '#FDECEC', color: '#DC3545' }}>{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: '#E5EEF4' }}>
        {(['All', 'Fitness', 'Illness'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#1A2B3C' : '#9AAFBF',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(15,33,51,0.08)' : 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FBFE', borderBottom: '1px solid #E5EEF4' }}>
              {['Type', 'Patient', 'Exam Date', 'Details', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: '#9AAFBF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.id}
                style={{ borderTop: i > 0 ? '1px solid #F0F6FA' : 'none' }}
                className="transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8FBFE'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                <td className="px-5 py-3">
                  <Badge variant={c.type === 'Fitness' ? 'green' : 'yellow'}>{c.type}</Badge>
                </td>
                <td className="px-5 py-3 text-sm font-medium" style={{ color: '#1A2B3C' }}>
                  {c.patientName}
                  {(c.age || c.gender) && (
                    <span className="ml-1.5 text-xs font-normal" style={{ color: '#9AAFBF' }}>
                      {c.age ? `${c.age}y` : ''}{c.age && c.gender ? ' · ' : ''}{c.gender || ''}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>
                  {c.date ? new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>
                  {c.type === 'Fitness' ? c.fitnessType : `${c.diagnosis} (${c.startDate} to ${c.endDate})`}
                </td>
                <td className="px-5 py-3">
                  <button
                    className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                    style={{ background: '#E6F5EE', color: '#1FA563' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#D0EDE0'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E6F5EE'; }}
                    onClick={() => window.print()}
                  >
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: '#9AAFBF' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: '#9AAFBF' }}>No certificates found</div>
        ) : null}
      </Card>
    </div>
  );
}
