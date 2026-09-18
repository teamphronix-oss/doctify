import { useEffect, useState } from 'react';
import {
  addFamilyMember,
  getPatientFull,
  getFamily,
  removeFamilyMember,
  renameFamily,
  searchPatients,
  type FamilyDetailsData,
} from '../api/client';
import type { Patient, Screen } from '../types';
import { Button, Card, Input, PageHeader, Badge } from '../components/ui';

interface FamilyDetailsProps {
  familyId: string;
  onNavigate: (screen: Screen, data?: unknown) => void;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(date?: string) {
  if (!date) return 'No visits';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function FamilyDetails({ familyId, onNavigate }: FamilyDetailsProps) {
  const [family, setFamily] = useState<FamilyDetailsData | null>(null);
  const [patientRecords, setPatientRecords] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [busyPatient, setBusyPatient] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [adding, setAdding] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const memberPageSize = 10;

  const loadFamily = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFamily(familyId);
      setFamily(data);
      setNewLabel(data.label);

      const records = await Promise.all(
        data.members.map(async member => {
          try {
            return [member.id, await getPatientFull(member.id)] as const;
          } catch {
            return null;
          }
        })
      );

      const map: Record<string, Patient> = {};
      records.forEach(item => {
        if (item) map[item[0]] = item[1];
      });
      setPatientRecords(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load family.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamily();
  }, [familyId]);

  useEffect(() => {
    if (!showAdd) return;

    const timer = window.setTimeout(async () => {
      try {
        setPatientResults(await searchPatients(patientQuery.trim()));
      } catch {
        setPatientResults([]);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [patientQuery, showAdd]);

  const addPatient = async (patientId: string) => {
    setAdding(true);
    try {
      await addFamilyMember(familyId, patientId);
      setShowAdd(false);
      setPatientQuery('');
      setPatientResults([]);
      setMemberPage(1);
      await loadFamily();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not add patient to family.');
    } finally {
      setAdding(false);
    }
  };

  const removePatient = async (patientId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this family? The patient record will not be deleted.`)) return;

    setBusyPatient(patientId);
    try {
      await removeFamilyMember(familyId, patientId);
      await loadFamily();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove family member.');
    } finally {
      setBusyPatient(null);
    }
  };

  const filteredMembers = family
    ? family.members.filter(member => {
        const q = memberQuery.trim().toLowerCase();
        if (!q) return true;
        return member.name.toLowerCase().includes(q) || member.phone.toLowerCase().includes(q);
      })
    : [];

  const memberTotalPages = Math.max(1, Math.ceil(filteredMembers.length / memberPageSize));
  const visibleMembers = filteredMembers.slice(
    (memberPage - 1) * memberPageSize,
    memberPage * memberPageSize
  );

  const saveRename = async () => {
    const label = newLabel.trim();
    if (!label) return;

    setSavingName(true);
    try {
      await renameFamily(familyId, label);
      setRenameOpen(false);
      await loadFamily();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not rename family.');
    } finally {
      setSavingName(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto" style={{ padding: '28px 32px', background: '#F3F8FB' }}>
        <PageHeader title="Family Details" subtitle="Loading family record…" />
        <Card className="p-6 animate-pulse">
          <div className="h-5 bg-slate-100 rounded w-48 mb-3" />
          <div className="h-3 bg-slate-100 rounded w-28" />
        </Card>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="h-full overflow-y-auto" style={{ padding: '28px 32px', background: '#F3F8FB' }}>
        <PageHeader title="Family Details" subtitle="Family record could not be loaded" />
        <Card className="p-8 text-center">
          <div className="text-sm" style={{ color: '#C52F3E' }}>{error || 'Family not found.'}</div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => onNavigate('families')}>Back to Families</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ padding: '28px 32px', background: '#F3F8FB' }}
    >
      <PageHeader
        title={family.label}
        subtitle={`${family.memberCount} family member${family.memberCount === 1 ? '' : 's'} · Family ID ${family.id}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onNavigate('families')}>
              ← Families
            </Button>
            <Button variant="secondary" onClick={() => setRenameOpen(true)}>
              Rename
            </Button>
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              + Add Member
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: '#FDEEEE', color: '#C52F3E' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <div className="text-[11px] uppercase font-semibold tracking-wide" style={{ color: '#8AA0B0' }}>
            Members
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: '#183247' }}>
            {family.memberCount}
          </div>
          <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>Patients linked to this family</div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] uppercase font-semibold tracking-wide" style={{ color: '#8AA0B0' }}>
            Total Visits
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: '#183247' }}>
            {Object.values(patientRecords).reduce((sum, patient) => sum + patient.visits.length, 0)}
          </div>
          <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>Across all family members</div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] uppercase font-semibold tracking-wide" style={{ color: '#8AA0B0' }}>
            Latest Family Visit
          </div>
          <div className="text-lg font-bold mt-1" style={{ color: '#183247' }}>
            {formatDate(
              Object.values(patientRecords)
                .flatMap(patient => patient.visits)
                .sort((a, b) => b.date.localeCompare(a.date))[0]?.date
            )}
          </div>
          <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>Most recent recorded visit</div>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-base font-bold" style={{ color: '#183247' }}>Family Members</div>
            <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>
              Click a member to open their complete patient record.
            </div>
          </div>
          <Badge variant="green">{family.memberCount} members</Badge>
        </div>

        <div className="mb-4">
          <Input
            label="Search members"
            value={memberQuery}
            onChange={e => { setMemberQuery(e.target.value); setMemberPage(1); }}
            placeholder="Search by member name or phone"
          />
        </div>

        <div className="flex flex-col gap-3">
          {visibleMembers.map(member => {
            const patient = patientRecords[member.id];
            const latestVisit = patient?.visits[0];

            return (
              <div
                key={member.id}
                className="rounded-2xl p-4"
                style={{ border: '1px solid #E3EDF3', background: '#FBFCFD' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#E8F4FA', color: '#2196C9' }}
                  >
                    {initials(member.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-bold" style={{ color: '#183247' }}>
                        {member.name}
                      </div>
                      {latestVisit && <Badge variant="blue">Has visits</Badge>}
                    </div>

                    <div className="text-xs mt-1" style={{ color: '#718797' }}>
                      {member.age ? `${member.age} years` : 'Age not recorded'} · {member.gender || 'Gender not recorded'}
                      {member.phone ? ` · ${member.phone}` : ''}
                    </div>
                  </div>

                  <div className="lg:w-36">
                    <div className="text-[10px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                      Last Visit
                    </div>
                    <div className="text-xs font-semibold mt-1" style={{ color: '#183247' }}>
                      {formatDate(latestVisit?.date)}
                    </div>
                  </div>

                  <div className="lg:w-28">
                    <div className="text-[10px] uppercase font-semibold" style={{ color: '#8AA0B0' }}>
                      Visits
                    </div>
                    <div className="text-xs font-semibold mt-1" style={{ color: '#183247' }}>
                      {patient?.visits.length ?? '—'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => patient
                        ? onNavigate('patient-details', patient)
                        : getPatientFull(member.id).then(p => onNavigate('patient-details', p))}
                    >
                      Open Patient
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyPatient === member.id}
                      onClick={() => removePatient(member.id, member.name)}
                    >
                      {busyPatient === member.id ? 'Removing…' : 'Remove'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleMembers.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: '#8AA0B0' }}>
              No family members match your search.
            </div>
          )}
        </div>

        {memberTotalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-4 pt-4" style={{ borderTop: '1px solid #E7EEF3' }}>
            <div className="text-xs" style={{ color: '#8AA0B0' }}>
              Showing {(memberPage - 1) * memberPageSize + 1}–{Math.min(memberPage * memberPageSize, filteredMembers.length)} of {filteredMembers.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={memberPage === 1} onClick={() => setMemberPage(p => Math.max(1, p - 1))}>← Previous</Button>
              <span className="text-xs font-semibold" style={{ color: '#5A7080' }}>{memberPage}/{memberTotalPages}</span>
              <Button variant="secondary" size="sm" disabled={memberPage === memberTotalPages} onClick={() => setMemberPage(p => Math.min(memberTotalPages, p + 1))}>Next →</Button>
            </div>
          </div>
        )}
      </Card>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,33,51,.55)', backdropFilter: 'blur(3px)' }}
        >
          <Card className="w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-base font-bold" style={{ color: '#183247' }}>
                  Add Existing Patient
                </div>
                <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>
                  Search for a patient and add their existing record to {family.label}.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-lg"
                style={{ color: '#8AA0B0' }}
              >
                ×
              </button>
            </div>

            <Input
              label="Search patient"
              value={patientQuery}
              onChange={e => setPatientQuery(e.target.value)}
              placeholder="Name or phone"
            />

            <div className="mt-3 max-h-72 overflow-y-auto flex flex-col gap-2">
              {patientResults
                .filter(patient => !family.members.some(member => member.id === patient.id))
                .map(patient => (
                  <button
                    key={patient.id}
                    type="button"
                    disabled={adding}
                    onClick={() => addPatient(patient.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: '#F8FBFD', border: '1px solid #E3EDF3' }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: '#E8F4FA', color: '#2196C9' }}
                    >
                      {initials(patient.name)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: '#183247' }}>{patient.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#8AA0B0' }}>
                        {patient.age} years · {patient.gender} · {patient.phone || 'No phone'}
                      </div>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#2196C9' }}>
                      {adding ? 'Adding…' : 'Add'}
                    </span>
                  </button>
                ))}

              {patientQuery && patientResults.length === 0 && (
                <div className="text-xs text-center py-6" style={{ color: '#8AA0B0' }}>
                  No patients found.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {renameOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,33,51,.55)', backdropFilter: 'blur(3px)' }}
        >
          <Card className="w-full max-w-md p-6 shadow-2xl">
            <div className="text-base font-bold" style={{ color: '#183247' }}>
              Rename Family
            </div>
            <div className="text-xs mt-1 mb-4" style={{ color: '#8AA0B0' }}>
              Update the name shown throughout Doctify.
            </div>

            <Input
              label="Family name"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Patil Family"
            />

            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" disabled={!newLabel.trim() || savingName} onClick={saveRename}>
                {savingName ? 'Saving…' : 'Save Name'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
