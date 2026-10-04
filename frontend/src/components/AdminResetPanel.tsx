import { useState } from 'react';
import { Button, Input } from './ui';

// Self-contained on purpose (talks to the backend directly, not through
// api/client.ts) - this keeps it unaffected by other changes to that file.
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8123';

interface AdminResetPanelProps {
  // Called when the doctor dismisses the panel (Cancel, or Close after
  // a successful reset) - the Login screen uses this to hide it again.
  onClose: () => void;
}

// Shown directly under "Forgot PIN?" on the login screen, for the one
// scenario where a doctor is fully locked out and has no way to log in
// to reset it themselves. You (the admin) read the Admin Code and a new
// PIN out to them over a call, and they fill this in on their own
// computer - it talks to their own local backend, no internet required.
export default function AdminResetPanel({ onClose }: AdminResetPanelProps) {
  const [adminCode, setAdminCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');

    if (!adminCode || !userCode || !newPin) {
      setError('Admin code, user code and new PIN are all required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode, userCode, newPin }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Could not reset PIN (${res.status}).`);
      }

      setMessage(data.message || 'PIN reset successfully.');
      setAdminCode('');
      setUserCode('');
      setNewPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mt-3 flex flex-col gap-3"
      style={{ background: '#F7FAFC', border: '1px solid #D4E5F0' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs" style={{ color: '#5A7080' }}>
          Get the Admin Code from your admin.
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-xs leading-none flex-shrink-0"
          style={{ color: '#9AAFBF' }}
        >
          ✕
        </button>
      </div>

      {message ? (
        <>
          <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#E6F7EE', color: '#1E8A4C' }}>
            {message} You can close this and log in with the new PIN.
          </div>
          <Button variant="secondary" size="sm" onClick={onClose} className="self-start">
            Close
          </Button>
        </>
      ) : (
        <>
          <Input
            label="Admin Code"
            type="password"
            value={adminCode}
            onChange={e => setAdminCode(e.target.value)}
            placeholder="Given by your admin"
          />
          <Input
            label="Doctor's User Code"
            value={userCode}
            onChange={e => setUserCode(e.target.value.toUpperCase())}
            placeholder="e.g. DR001"
          />
          <Input
            label="New PIN"
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
            placeholder="New PIN to set"
          />

          {error && (
            <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#FDEEEE', color: '#DC3545' }}>
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Resetting…' : 'Reset PIN'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
