import { useEffect, useState } from 'react';
import type { Patient, Screen } from '../types';
import {
  searchPatients,
  getPatientFull,
  deletePatient,
  createBackupAndDownload,
  deleteAllPatientData,
} from '../api/client';
import { Input, Card, Badge, Button, PageHeader, EmptyState } from '../components/ui';

interface PatientSearchProps {
  onNavigate: (screen: Screen, data?: unknown) => void;
}

export default function PatientSearch({ onNavigate }: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

 const [showDeleteAll, setShowDeleteAll] = useState(false);
const [backupReady, setBackupReady] = useState(false);
const [backupConfirmed, setBackupConfirmed] = useState(false);
const [backupFileName, setBackupFileName] = useState<string | null>(null);
const [backupLoading, setBackupLoading] = useState(false);
const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);

    try {
      await deletePatient(deleteTarget.id);

      setPatients(current =>
        current.filter(p => p.id !== deleteTarget.id)
      );

      setDeleteTarget(null);
    } catch {
      setError(`Could not delete ${deleteTarget.name}. Please try again.`);
    } finally {
      setDeletingId(null);
    }
  };

  const loadPatients = (q: string) => {
    setLoading(true);
    setError(null);
    searchPatients(q)
      .then(setPatients)
      .catch(() => setError('Could not reach the backend. Is it running on http://127.0.0.1:8123?'))
      .finally(() => setLoading(false));
  };

  const handleCreateBackup = async () => {
  setBackupLoading(true);
  setError(null);

  try {
    const backup = await createBackupAndDownload();

    setBackupFileName(backup.fileName);
    setBackupReady(true);
    setBackupConfirmed(false);
  } catch (error) {
    console.error(error);

    setBackupReady(false);
    setBackupFileName(null);

    setError(
      error instanceof Error
        ? error.message
        : 'Could not create the database backup.'
    );
  } finally {
    setBackupLoading(false);
  }
};


const handleDeleteAll = async () => {
  if (!backupFileName || !backupReady || !backupConfirmed) {
    return;
  }

  setDeleteAllLoading(true);
  setError(null);

  try {
    await deleteAllPatientData(backupFileName);

    setPatients([]);

    setShowDeleteAll(false);
    setBackupReady(false);
    setBackupConfirmed(false);
    setBackupFileName(null);
  } catch (error) {
    console.error(error);

    setError(
      error instanceof Error
        ? error.message
        : 'Could not delete all patient data.'
    );
  } finally {
    setDeleteAllLoading(false);
  }
};

  // Load once on mount, then re-fetch whenever the search text changes
  // (debounced slightly so it doesn't fire on every keystroke).
  useEffect(() => {
    const timeout = setTimeout(() => loadPatients(query), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = patients.filter(p => {
    const lastVisitDate = p.visits[p.visits.length - 1]?.date ?? '';
    const matchFrom = !fromDate || lastVisitDate >= fromDate;
    const matchTo = !toDate || lastVisitDate <= toDate;
    return matchFrom && matchTo;
  });

  // The list only has a summary of the LAST visit (for the table columns).
  // Opening a patient needs their full visit history + medicines, so we
  // fetch the complete record first, then navigate.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const openPatient = async (id: string, destination: 'patient-details' | 'print-preview') => {
    setOpeningId(id);
    try {
      const full = await getPatientFull(id);
      onNavigate(destination, full);
    } catch {
      setError('Could not load that patient. Please try again.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ padding: '28px 32px' }}>
      <PageHeader
        title="Patient Search"
        subtitle="Search by name or phone number. Click a patient to view their full history."
        actions={
          <Button variant="primary" onClick={() => onNavigate('add-patient')} icon={
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          }>New Patient</Button>
        }
      />

      {/* Filters */}
      <Card className="p-4 mb-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 180px 180px auto' }}>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or phone…"
            icon={
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
              </svg>
            }
          />
          <Input label="" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ fontSize: 13, height: 36 } as React.CSSProperties}
          />
          <Input label="" type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ fontSize: 13, height: 36 } as React.CSSProperties}
          />
          <Button variant="secondary" onClick={() => { setQuery(''); setFromDate(''); setToDate(''); }}>
            Clear
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs" style={{ color: '#8FA5B4' }}>
            {filtered.length} patient{filtered.length !== 1 ? 's' : ''} found
          </div>

          {patients.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAll(true)}
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              Delete All Patient Data
            </button>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="text-sm text-center py-10" style={{ color: '#9AAFBF' }}>Loading patients…</div>
        ) : error ? (
          <div className="text-sm text-center py-10" style={{ color: '#DC3545' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" /></svg>}
            title="No patients found"
            subtitle="Try a different search term or clear the filters"
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr style={{ background: '#F8FBFE', borderBottom: '1px solid #E5EEF4' }}>
                  {['Patient', 'Age / Gender', 'Phone', 'Last Visit', 'Diagnosis', 'Status', ''].map(h => (
                    <th
                      key={h}
                      className="sticky top-0 z-10 bg-[#F8FBFE] px-5 py-3 text-left text-xs font-semibold"
                      style={{
                        color: '#718797',
                        borderBottom: '1px solid #E5EEF4',
                      }}
                    ></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const lastVisit = p.visits[p.visits.length - 1];
                  const isFamily = !!p.familyId;
                  return (
                    <tr
                      key={p.id}
                      style={{ borderTop: i > 0 ? '1px solid #F0F6FA' : 'none', cursor: 'pointer' }}
                      className="group cursor-pointer transition-colors hover:bg-gradient-to-r hover:from-[#F8FCFE] hover:to-[#F5FAF8]"
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8FBFE'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      onClick={() => openPatient(p.id, 'patient-details')}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                            style={{ width: 32, height: 32, background: '#E8F4FA', color: '#2196C9' }}
                          >
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#1A2B3C' }}>
                              {p.name}
                              {isFamily && (
                                <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium" style={{ background: '#E6F5EE', color: '#1FA563', fontSize: 10 }}>
                                  <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                  Family
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>{p.age}y · {p.gender}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>{p.phone}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#5A7080' }}>
                        {lastVisit ? new Date(lastVisit.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#1A2B3C', maxWidth: 180 }}>
                        <span className="block truncate" title={lastVisit?.diagnosis}>{lastVisit?.diagnosis ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        {lastVisit && (
                          <Badge variant={lastVisit.pharmacyStatus === 'dispensed' ? 'green' : lastVisit.pharmacyStatus === 'sent' ? 'blue' : 'gray'}>
                            {lastVisit.pharmacyStatus === 'dispensed' ? 'Dispensed' : lastVisit.pharmacyStatus === 'sent' ? 'Rx Sent' : 'Pending'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openPatient(p.id, 'patient-details')}
                            disabled={openingId === p.id}
                            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                            style={{ background: '#E8F4FA', color: '#2196C9' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#D4E5F0'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E8F4FA'; }}
                          >
                            {openingId === p.id ? 'Loading…' : 'Open'}
                          </button>
                          <button
                            onClick={() => openPatient(p.id, 'print-preview')}
                            disabled={openingId === p.id}
                            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                            style={{ background: '#E6F5EE', color: '#1FA563' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#D0EDE0'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E6F5EE'; }}
                          >
                            Print
                          </button>

                          <button
                            onClick={() => setDeleteTarget(p)}
                            disabled={deletingId === p.id}
                            className="text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                            style={{
                              background: '#FDEEEE',
                              color: '#DC3545',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#F9DADA';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#FDEEEE';
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(15,33,51,0.45)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <Card
            className="w-full max-w-md p-6"
            style={{
              boxShadow: '0 20px 60px rgba(15,33,51,0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  background: '#FDEEEE',
                  color: '#DC3545',
                }}
              >
                ⚠
              </div>

              <div>
                <div
                  className="text-base font-bold"
                  style={{ color: '#1A2B3C' }}
                >
                  Delete patient?
                </div>

                <div
                  className="text-sm font-semibold mt-1"
                  style={{ color: '#5A7080' }}
                >
                  {deleteTarget.name}
                </div>

                <p
                  className="text-xs mt-2"
                  style={{
                    color: '#9AAFBF',
                    lineHeight: 1.6,
                  }}
                >
                  This will permanently delete the patient profile,
                  all visits, and all medicines. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={!!deletingId}
              >
                {deletingId ? 'Deleting…' : 'Delete Patient'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showDeleteAll && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102235]/50 p-4 backdrop-blur-sm">
    <Card className="w-full max-w-md overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-red-50 via-white to-amber-50 p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            ⚠
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#162B3B]">
              Delete all patient data?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#647988]">
              This will remove all active patient records,
              their visits, and their medicines from this clinic.
            </p>
          </div>
        </div>

       <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
      💾
    </div>

    <div>
      <p className="text-sm font-bold text-amber-900">
        Backup required before deletion
      </p>

      <p className="mt-1 text-xs leading-5 text-amber-800">
        Create a Full Doctify Backup before continuing.
        Keep the downloaded backup somewhere safe so the
        clinic can be restored later if needed.
      </p>
    </div>
  </div>

  <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-[#647988]">
      Your backup will include
    </p>

    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="flex items-center gap-2 text-xs text-[#526776]">
        <span className="text-emerald-600">✓</span>
        Complete database
      </div>

      <div className="flex items-center gap-2 text-xs text-[#526776]">
        <span className="text-emerald-600">✓</span>
        Excel data export
      </div>

      <div className="flex items-center gap-2 text-xs text-[#526776]">
        <span className="text-emerald-600">✓</span>
        PDF backup report
      </div>

      <div className="flex items-center gap-2 text-xs text-[#526776]">
        <span className="text-emerald-600">✓</span>
        Backup information
      </div>
    </div>
  </div>

  <div className="mt-4 flex items-start gap-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF4FA] text-xs font-bold text-[#277DAE]">
      1
    </div>

    <div>
      <p className="text-xs font-semibold text-[#344C5C]">
        Create and download your backup
      </p>

      <p className="mt-0.5 text-[11px] leading-4 text-[#718391]">
        A single ZIP file containing the complete backup
        package will be downloaded.
      </p>
    </div>
  </div>

  <button
    type="button"
    onClick={handleCreateBackup}
    disabled={backupLoading}
    className="mt-4 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {backupLoading
      ? 'Creating your backup...'
      : backupReady
        ? '✓ Backup Created & Downloaded'
        : 'Create & Download Full Backup'}
  </button>

  {backupFileName && (
    <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-emerald-800">
        Backup ready
      </p>

      <p className="mt-0.5 break-all text-[10px] leading-4 text-emerald-700">
        {backupFileName}
      </p>
    </div>
  )}
</div>

       <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#D8E5EE] bg-[#F8FBFE] p-3">
  <input
    type="checkbox"
    checked={backupConfirmed}
    disabled={!backupReady || backupLoading}
    onChange={(event) =>
      setBackupConfirmed(event.target.checked)
    }
    className="mt-0.5 h-4 w-4 rounded border-gray-300"
  />

  <span className="text-xs leading-5 text-[#526776]">
    <span className="font-semibold text-[#344C5C]">
      I have downloaded and safely stored the backup.
    </span>

    <span className="block text-[#718391]">
      I understand that the patient data will be removed
      from this clinic.
    </span>
  </span>
</label>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (backupLoading || deleteAllLoading) return;

              setShowDeleteAll(false);
              setBackupReady(false);
              setBackupConfirmed(false);
              setBackupFileName(null);
            }}
          >
            Cancel
          </Button>

          <Button
  variant="danger"
  disabled={
    !backupReady ||
    !backupConfirmed ||
    deleteAllLoading
  }
  onClick={handleDeleteAll}
>
  {deleteAllLoading
    ? 'Deleting patient data...'
    : 'Delete Patient Data'}
</Button>
        </div>
      </div>
    </Card>
  </div>
)}
    </div>
  );
}
