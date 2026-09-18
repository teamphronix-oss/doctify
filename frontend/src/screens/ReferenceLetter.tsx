import { useEffect, useState } from 'react';
import type { ReferenceLetter as Letter } from '../types';
import { listReferenceLetters, addReferenceLetter } from '../api/client';
import { Card, Button, Input, Textarea, PageHeader, Badge } from '../components/ui';

export default function ReferenceLetter() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [referredTo, setReferredTo] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'Routine' | 'Urgent'>('Routine');

  const load = () => {
    setLoading(true);
    listReferenceLetters()
      .then(setLetters)
      .catch(() => setError('Could not reach the backend.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async () => {
    if (!patientName.trim() || !referredTo.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addReferenceLetter({ patientName, referredTo, reason, urgency });
      setPatientName(''); setReferredTo(''); setReason(''); setUrgency('Routine');
      setShowForm(false);
      load();
    } catch {
      setError('Failed to save letter. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ padding: '28px 32px' }}>
      <PageHeader
        title="Reference Letters"
        subtitle="Compose and manage patient referral letters"
        actions={
          <Button variant="primary" onClick={() => setShowForm(s => !s)} icon={
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          }>
            {showForm ? 'Cancel' : 'New Letter'}
          </Button>
        }
      />

      {showForm && (
        <Card className="p-5 mb-5">
          <div className="text-sm font-semibold mb-4" style={{ color: '#1A2B3C' }}>Compose Reference Letter</div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Input label="Patient Name *" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" />
            <Input label="Referred To *" value={referredTo} onChange={e => setReferredTo(e.target.value)} placeholder="Doctor / Hospital" />
            <Textarea label="Reason for Referral" value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Clinical reason, investigations, history…" />
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: '#5A7080' }}>Urgency</div>
                <div className="flex gap-3">
                  {(['Routine', 'Urgent'] as const).map(u => (
                    <label key={u} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={urgency === u} onChange={() => setUrgency(u)} style={{ accentColor: '#2196C9' }} />
                      <span className="text-sm" style={{ color: '#1A2B3C' }}>{u}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button variant="primary" onClick={handleAdd} disabled={!patientName.trim() || !referredTo.trim() || saving}>
                {saving ? 'Saving...' : 'Save Letter'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: '#FDECEC', color: '#DC3545' }}>{error}</div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FBFE', borderBottom: '1px solid #E5EEF4' }}>
              {['Patient', 'Referred To', 'Reason', 'Date', 'Urgency', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: '#9AAFBF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {letters.map((l, i) => (
              <tr
                key={l.id}
                style={{ borderTop: i > 0 ? '1px solid #F0F6FA' : 'none' }}
                className="transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8FBFE'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                <td className="px-5 py-3 text-sm font-medium" style={{ color: '#1A2B3C' }}>{l.patientName}</td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>{l.referredTo}</td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080', maxWidth: 240 }}>
                  <span className="block truncate" title={l.reason}>{l.reason || '—'}</span>
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>
                  {new Date(l.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={l.urgency === 'Urgent' ? 'red' : 'gray'}>{l.urgency}</Badge>
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
        ) : letters.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: '#9AAFBF' }}>No reference letters yet</div>
        ) : null}
      </Card>
    </div>
  );
}
