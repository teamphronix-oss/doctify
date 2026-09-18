import { useEffect, useState } from 'react';
import type { Receipt } from '../types';
import { listReceipts, addReceipt } from '../api/client';
import { Card, Button, Input, PageHeader, Badge } from '../components/ui';

export default function CashReceipt() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('OPD Consultation');

  const load = () => {
    setLoading(true);
    listReceipts()
      .then(setReceipts)
      .catch(() => setError('Could not reach the backend.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalToday = receipts.reduce((s, r) => s + r.amount, 0);

  const handleAdd = async () => {
    if (!patientName.trim() || !amount) return;
    setSaving(true);
    setError(null);
    try {
      await addReceipt({ patientName, amount, description });
      setPatientName(''); setAmount(''); setDescription('OPD Consultation');
      setShowForm(false);
      load();
    } catch {
      setError('Failed to save receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ padding: '28px 32px' }}>
      <PageHeader
        title="Cash Receipts"
        subtitle="Record and print payment receipts for patients"
        actions={
          <Button variant="primary" onClick={() => setShowForm(s => !s)} icon={
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          }>
            {showForm ? 'Cancel' : 'Add Receipt'}
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E5EEF4' }}>
          <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: '#E6F5EE' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1FA563" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14v-4H8v-2h5V6l4 5-4 5z" />
            </svg>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#9AAFBF' }}>Total Collected</div>
            <div className="text-xl font-bold" style={{ color: '#1A2B3C' }}>₹{totalToday.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E5EEF4' }}>
          <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: '#E8F4FA' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2196C9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#9AAFBF' }}>Receipts</div>
            <div className="text-xl font-bold" style={{ color: '#1A2B3C' }}>{receipts.length}</div>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E5EEF4' }}>
          <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: '#FEF3E2' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#9AAFBF' }}>Avg per patient</div>
            <div className="text-xl font-bold" style={{ color: '#1A2B3C' }}>₹{receipts.length ? Math.round(totalToday / receipts.length) : 0}</div>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="p-5 mb-5">
          <div className="text-sm font-semibold mb-4" style={{ color: '#1A2B3C' }}>Add New Receipt</div>
          <div className="grid gap-4 items-end" style={{ gridTemplateColumns: '1fr 140px 1fr auto' }}>
            <Input label="Patient Name *" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" />
            <Input label="Amount (₹) *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300" />
            <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. OPD Consultation" />
            <Button variant="success" onClick={handleAdd} disabled={!patientName.trim() || !amount || saving}>
              {saving ? 'Saving...' : 'Add Receipt'}
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: '#FDECEC', color: '#DC3545' }}>{error}</div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FBFE', borderBottom: '1px solid #E5EEF4' }}>
              {['Receipt No.', 'Patient', 'Date', 'Description', 'Amount', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: '#9AAFBF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {receipts.map((r, i) => (
              <tr
                key={r.id}
                style={{ borderTop: i > 0 ? '1px solid #F0F6FA' : 'none' }}
                className="transition-colors"
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8FBFE'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                <td className="px-5 py-3">
                  <Badge variant="gray">{r.receiptNo}</Badge>
                </td>
                <td className="px-5 py-3 text-sm font-medium" style={{ color: '#1A2B3C' }}>{r.patientName}</td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>
                  {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>{r.description}</td>
                <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#1FA563' }}>₹{r.amount.toLocaleString('en-IN')}</td>
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
        ) : receipts.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: '#9AAFBF' }}>No receipts yet</div>
        ) : null}
      </Card>
    </div>
  );
}
