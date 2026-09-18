import { useEffect, useState } from 'react';
import { getPatientFull, searchFamilies, type FamilySummary } from '../api/client';
import type { Screen } from '../types';
import { Button, Card, Input, PageHeader } from '../components/ui';

interface FamiliesProps {
  onNavigate: (screen: Screen, data?: unknown) => void;
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{
        background: '#E8F4FA',
        color: '#2196C9',
      }}
    >
      {name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </div>
  );
}

export default function Families({ onNavigate }: FamiliesProps) {
  const [query, setQuery] = useState('');
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 10;

  const loadFamilies = async (search = '') => {
    setLoading(true);
    setError('');

    try {
      const result = await searchFamilies(search);
      setFamilies(result);
    } catch (err) {
      setFamilies([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load families.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);

    const timer = window.setTimeout(() => {
      loadFamilies(query.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const openFamily = (familyId: string) => {
    setOpeningId(familyId);

    try {
      onNavigate('family-details', familyId);
    } finally {
      setOpeningId(null);
    }
  };

  const openPatient = async (patientId: string) => {
    try {
      const patient = await getPatientFull(patientId);
      onNavigate('patient-details', patient);
    } catch {
      window.alert('Could not open this patient.');
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(families.length / pageSize)
  );

  const startIndex = (page - 1) * pageSize;

  const visibleFamilies = families.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        padding: '28px 32px',
        background: '#F3F8FB',
      }}
    >
      <PageHeader
        title="Families"
        subtitle="View and manage patients grouped under the same family"
        actions={
          <Button
            variant="primary"
            onClick={() => onNavigate('add-patient')}
          >
            + Add Patient
          </Button>
        }
      />

      {/* Search */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Input
              label="Search families"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Family name, member name or phone number"
            />
          </div>

          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: '#F7FAFC',
              border: '1px solid #E4EDF3',
              color: '#5A7080',
            }}
          >
            <span
              className="font-semibold"
              style={{ color: '#183247' }}
            >
              {families.length}
            </span>{' '}
            {families.length === 1 ? 'family' : 'families'}
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm"
          style={{
            background: '#FDEEEE',
            color: '#C52F3E',
            border: '1px solid #F4C9CE',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card
              key={i}
              className="p-5 animate-pulse"
            >
              <div className="h-4 rounded bg-slate-100 w-40 mb-3" />
              <div className="h-3 rounded bg-slate-100 w-24 mb-5" />
              <div className="h-12 rounded bg-slate-100" />
            </Card>
          ))}
        </div>
      ) : families.length === 0 ? (
        /* Empty state */
        <Card className="py-16 text-center">
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: '#E8F4FA',
              color: '#2196C9',
            }}
          >
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <div
            className="text-sm font-bold"
            style={{ color: '#183247' }}
          >
            {query
              ? 'No families found'
              : 'No families created yet'}
          </div>

          <div
            className="text-xs mt-1"
            style={{ color: '#8AA0B0' }}
          >
            {query
              ? 'Try another family name, member name or phone number.'
              : 'Create a family while adding a patient.'}
          </div>
        </Card>
      ) : (
        /*
         * IMPORTANT:
         * Fragment wraps the family grid + pagination.
         */
        <>
          {/* Family cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
            {visibleFamilies.map(family => (
              <Card
                key={family.id}
                className="p-5"
                style={{
                  border: '1px solid #DDEAF1',
                  boxShadow:
                    '0 4px 16px rgba(30,70,95,0.04)',
                }}
              >
                {/* Family header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: '#E6F5EE',
                          color: '#1FA563',
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>

                      <div>
                        <h2
                          className="text-base font-bold"
                          style={{ color: '#183247' }}
                        >
                          {family.label}
                        </h2>

                        <div
                          className="text-xs mt-0.5"
                          style={{ color: '#8AA0B0' }}
                        >
                          {family.memberCount}{' '}
                          member
                          {family.memberCount === 1
                            ? ''
                            : 's'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openFamily(family.id)}
                    disabled={openingId === family.id}
                  >
                    {openingId === family.id
                      ? 'Opening…'
                      : 'Open Family'}
                  </Button>
                </div>

                {/* Members */}
                <div className="mt-4 flex flex-col gap-2">
                  {family.members.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() =>
                        openPatient(member.id)
                      }
                      className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors"
                      style={{
                        background: '#F8FBFD',
                        border: '1px solid #E7EEF3',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background =
                          '#EFF7FA';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background =
                          '#F8FBFD';
                      }}
                    >
                      <MemberAvatar
                        name={member.name}
                      />

                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: '#243746' }}
                        >
                          {member.name}
                        </div>

                        <div
                          className="text-xs mt-0.5"
                          style={{ color: '#8AA0B0' }}
                        >
                          {member.age
                            ? `${member.age} years`
                            : 'Age not recorded'}{' '}
                          ·{' '}
                          {member.gender ||
                            'Gender not recorded'}
                        </div>
                      </div>

                      <div
                        className="text-xs hidden sm:block"
                        style={{ color: '#8AA0B0' }}
                      >
                        {member.phone || 'No phone'}
                      </div>

                      <span
                        style={{ color: '#9AAFBF' }}
                      >
                        →
                      </span>
                    </button>
                  ))}
                </div>

                {/* Member count */}
                {family.memberCount >
                  family.members.length && (
                  <div
                    className="text-xs mt-3"
                    style={{ color: '#8AA0B0' }}
                  >
                    Showing {family.members.length} of{' '}
                    {family.memberCount} members
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 pb-6">
              <div
                className="text-xs"
                style={{ color: '#8AA0B0' }}
              >
                Showing {startIndex + 1}–
                {Math.min(
                  startIndex + pageSize,
                  families.length
                )}{' '}
                of {families.length} families
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() =>
                    setPage(p => Math.max(1, p - 1))
                  }
                >
                  ← Previous
                </Button>

                <span
                  className="text-xs font-semibold px-2"
                  style={{ color: '#5A7080' }}
                >
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage(p =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}