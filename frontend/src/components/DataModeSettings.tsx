import { useEffect, useState } from 'react';
import { getDataMode, getSyncStatus, setDataMode, syncNow, type DataMode, type SyncStatus } from '../api/client';

export default function DataModeSettings() {
  const [mode, setMode] = useState<DataMode>('offline');
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const [m, s] = await Promise.all([getDataMode(), getSyncStatus()]);
      setMode(m);
      setStatus(s);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read sync status');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const changeMode = async (next: DataMode) => {
    if (next === mode) return;
    setBusy(true);
    setMessage('');
    try {
      const s = await setDataMode(next);
      setMode(next);
      setStatus(s);
      setMessage(next === 'online' ? 'Online sync enabled.' : 'Offline-only mode enabled.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not change data mode');
    } finally {
      setBusy(false);
    }
  };

  const manualSync = async () => {
    setBusy(true);
    setMessage('');
    try {
      const s = await syncNow();
      setStatus(s);
      setMessage(s.lastError ? `Sync error: ${s.lastError}` : 'Sync completed.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ maxWidth: 680, padding: 24, border: '1px solid #D4E5F0', borderRadius: 14, background: '#fff' }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: '#1A2B3C', fontSize: 18 }}>Data Mode</h2>
        <p style={{ margin: '6px 0 0', color: '#5A7080', fontSize: 13 }}>
          Choose whether this Doctify installation should keep data only on this computer or also sync it to the configured Supabase cloud.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {([
          ['offline', 'Offline Only', 'Everything stays in the local SQLite database. Doctify continues working without internet.'],
          ['online', 'Offline + Online', 'SQLite remains the local working database. Changes are synchronized to Supabase when internet is available.'],
        ] as const).map(([value, title, description]) => (
          <label key={value} style={{ display: 'flex', gap: 12, padding: 14, border: `1.5px solid ${mode === value ? '#2196C9' : '#D4E5F0'}`, borderRadius: 10, cursor: 'pointer', background: mode === value ? '#F5FAFD' : '#fff' }}>
            <input type="radio" name="doctify-data-mode" checked={mode === value} disabled={busy} onChange={() => changeMode(value)} />
            <span>
              <strong style={{ color: '#1A2B3C', fontSize: 14 }}>{title}</strong>
              <span style={{ display: 'block', marginTop: 3, color: '#5A7080', fontSize: 12 }}>{description}</span>
            </span>
          </label>
        ))}
      </div>

      {status && (
        <div style={{ marginTop: 18, padding: 12, borderRadius: 10, background: '#F7FAFC', color: '#5A7080', fontSize: 12 }}>
          <div><strong>Cloud configured:</strong> {status.configured ? 'Yes' : 'No'}</div>
          <div><strong>Pending changes:</strong> {status.pending}</div>
          {status.lastRun && <div><strong>Last sync:</strong> {new Date(status.lastRun).toLocaleString()}</div>}
          {status.lastError && <div style={{ color: '#DC3545', marginTop: 4 }}><strong>Last error:</strong> {status.lastError}</div>}
          {mode === 'online' && <button type="button" onClick={manualSync} disabled={busy} style={{ marginTop: 10, border: '1px solid #D4E5F0', background: '#fff', borderRadius: 8, padding: '7px 12px', cursor: busy ? 'not-allowed' : 'pointer' }}>Sync now</button>}
        </div>
      )}

      {message && <p style={{ margin: '12px 0 0', fontSize: 12, color: message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? '#DC3545' : '#1FA563' }}>{message}</p>}
    </section>
  );
}
