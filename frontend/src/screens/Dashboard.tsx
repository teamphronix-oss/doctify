import { useEffect, useState } from 'react';
import type { Screen, User } from '../types';
import { getDashboardSummary, type DashboardSummary } from '../api/client';
import { Card, PageHeader } from '../components/ui';

interface DashboardProps {
  user: User;
  onNavigate: (screen: Screen, data?: unknown) => void;
}

function Icon({
  children,
  size = 19,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function todayString() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function formatTime(value: string) {
  if (!value) return '';

  const date = new Date(value.replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Dashboard({
  user,
  onNavigate,
}: DashboardProps) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');

        const result = await getDashboardSummary(todayString());

        if (active) {
          setData(result);
        }
      } catch (err) {
        console.error('Dashboard loading failed:', err);

        if (active) {
          setError('Unable to load dashboard data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const todayPatients = data?.todayPatients ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gradient-to-br from-[#F4FAFE] via-[#F8FBFD] to-[#EEF7F4]">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-7 lg:px-8">

        {/* Header */}
        <PageHeader
          title={`Good morning, ${user.name.split(' ')[0]}`}
          subtitle={`${user.activeClinic.name} · ${new Date().toLocaleDateString(
            'en-IN',
            {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }
          )}`}
          actions={
            <button
              onClick={() => onNavigate('add-patient')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2196C9] to-[#287FD0] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(33,150,201,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(33,150,201,0.28)]"
            >
              <Icon>
                <path d="M12 5v14M5 12h14" />
              </Icon>
              New Patient
            </button>
          }
        />

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Today's OPD */}
          <Card className="relative overflow-hidden border-0 bg-white/90 p-5 shadow-[0_8px_30px_rgba(31,91,120,0.07)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2196C9] via-[#46B9DA] to-[#6AD6C0]" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#718797]">
                  Today's OPD
                </p>

                <p className="mt-2 text-3xl font-bold text-[#162B3B]">
                  {loading ? '—' : data?.opd.patients ?? 0}
                </p>

                <p className="mt-1 text-xs text-[#91A5B3]">
                  Patients seen today
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#E5F5FC] to-[#DFF3EE] text-[#2196C9]">
                <Icon>
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </Icon>
              </div>
            </div>
          </Card>

          {/* Total Patients */}
          <Card className="relative overflow-hidden border-0 bg-white/90 p-5 shadow-[0_8px_30px_rgba(31,91,120,0.07)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#6B7FE8] via-[#8D72D8] to-[#B56CCB]" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#718797]">
                  Total Patients
                </p>

                <p className="mt-2 text-3xl font-bold text-[#162B3B]">
                  {loading ? '—' : data?.totalPatients ?? 0}
                </p>

                <button
                  onClick={() => onNavigate('patient-search')}
                  className="mt-1 text-xs font-medium text-[#2196C9] hover:underline"
                >
                  Open patient records →
                </button>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#EEF0FF] to-[#F7ECFA] text-[#716DD2]">
                <Icon>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </Icon>
              </div>
            </div>
          </Card>

          {/* Collection */}
          <Card className="relative overflow-hidden border-0 bg-white/90 p-5 shadow-[0_8px_30px_rgba(31,91,120,0.07)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#27A86B] via-[#55BE7B] to-[#F2C45B]" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#718797]">
                  Today's Collection
                </p>

                <p className="mt-2 text-3xl font-bold text-[#162B3B]">
                  {loading
                    ? '—'
                    : `₹${(data?.revenue.total ?? 0).toLocaleString('en-IN')}`}
                </p>

                <button
                  onClick={() => onNavigate('cash-receipt')}
                  className="mt-1 text-xs font-medium text-[#2196C9] hover:underline"
                >
                  View receipts →
                </button>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8F8F0] to-[#FFF4D9] text-[#1FA563]">
                <Icon>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .5-3 1.5 1.3 1.5 3 1.5 3 .5 3 1.5-1.3 1.5-3 1.5-3-.5-3-1.5" />
                </Icon>
              </div>
            </div>
          </Card>

        </div>

        {/* Main */}
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* Today's Patients */}
          <Card className="overflow-hidden border-0 bg-white/95 shadow-[0_10px_35px_rgba(31,91,120,0.07)]">

            <div className="border-b border-[#E6EFF4] bg-gradient-to-r from-white to-[#F4FAFD] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#162B3B]">
                    Today's Patients
                  </h2>

                  <p className="mt-0.5 text-xs text-[#91A5B3]">
                    {data?.opd.visits ?? 0} visit
                    {data?.opd.visits === 1 ? '' : 's'} recorded today
                  </p>
                </div>

                <span className="rounded-full bg-[#EAF6FB] px-3 py-1 text-xs font-semibold text-[#2196C9]">
                  {data?.opd.patients ?? 0} patients
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-gradient-to-r from-[#F2F6F8] via-[#F8FBFC] to-[#F2F6F8]"
                  />
                ))}
              </div>
            ) : todayPatients.length === 0 ? (
              <div className="flex min-h-[270px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#E8F5FB] to-[#E7F7F0] text-[#2196C9]">
                  <Icon size={22}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </Icon>
                </div>

                <p className="mt-4 text-sm font-semibold text-[#162B3B]">
                  No patients recorded today
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-[#91A5B3]">
                  Once today's first visit is recorded, it will appear here.
                </p>

                <button
                  onClick={() => onNavigate('add-patient')}
                  className="mt-4 rounded-lg bg-gradient-to-r from-[#E8F5FB] to-[#E8F7F0] px-4 py-2 text-sm font-semibold text-[#2189B9] transition hover:shadow-sm"
                >
                  + New Patient
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF3F6]">
                {todayPatients.slice(0, 8).map(patient => (
                  <button
                    key={`${patient.id}-${patient.visit_date}`}
                    onClick={() =>
                      onNavigate('patient-details', {
                        id: String(patient.id),
                        name: patient.name,
                      })
                    }
                    className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gradient-to-r hover:from-[#F7FBFD] hover:to-[#F4FAF7]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F5FB] to-[#E8F6F1] text-sm font-bold text-[#218BB8]">
                      {patient.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#162B3B]">
                        {patient.name}
                      </p>

                      <p className="mt-0.5 text-xs text-[#91A5B3]">
                        {patient.age ?? '—'}y
                        {patient.gender ? ` · ${patient.gender}` : ''}
                      </p>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-medium text-[#526C7B]">
                        {formatTime(patient.visit_date)}
                      </p>

                      {patient.diagnosis && (
                        <p className="mt-0.5 max-w-[180px] truncate text-xs text-[#9AAAB4]">
                          {patient.diagnosis}
                        </p>
                      )}
                    </div>

                    <span className="rounded-lg bg-[#F0F7FA] px-3 py-2 text-xs font-semibold text-[#2196C9] transition group-hover:bg-[#E3F2F8]">
                      Open
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!loading && todayPatients.length > 8 && (
              <div className="border-t border-[#E6EFF4] px-5 py-3">
                <button
                  onClick={() => onNavigate('patient-search')}
                  className="text-sm font-semibold text-[#2196C9] hover:underline"
                >
                  View all today's patients →
                </button>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 bg-white/95 p-5 shadow-[0_10px_35px_rgba(31,91,120,0.07)]">
            <h2 className="text-base font-semibold text-[#162B3B]">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-[#91A5B3]">
              Common clinic tasks
            </p>

            <div className="mt-5 space-y-3">

              <button
                onClick={() => onNavigate('add-patient')}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#DCEAF1] bg-gradient-to-r from-[#F8FCFE] to-[#F1FAF7] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#BFDDE9] hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#DFF2FA] to-[#E2F7EF] text-[#2196C9]">
                  <Icon>
                    <path d="M12 5v14M5 12h14" />
                  </Icon>
                </span>

                <span>
                  <span className="block text-sm font-semibold text-[#162B3B]">
                    New Patient
                  </span>
                  <span className="text-xs text-[#91A5B3]">
                    Register patient & visit
                  </span>
                </span>
              </button>

              <button
                onClick={() => onNavigate('patient-search')}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#DCEAF1] bg-gradient-to-r from-[#FAF9FF] to-[#F7FBFD] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#C9D8E5] hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ECEAFF] to-[#EEF5F9] text-[#716DD2]">
                  <Icon>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </Icon>
                </span>

                <span>
                  <span className="block text-sm font-semibold text-[#162B3B]">
                    Search Patient
                  </span>
                  <span className="text-xs text-[#91A5B3]">
                    Open an existing record
                  </span>
                </span>
              </button>

              <button
                onClick={() => onNavigate('cash-receipt')}
                className="group flex w-full items-center gap-3 rounded-xl border border-[#DCEAF1] bg-gradient-to-r from-[#F8FCF9] to-[#FFF9EE] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#CDE5D7] hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E5F7EE] to-[#FFF3D8] text-[#1FA563]">
                  <Icon>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v8M15 10c0-1-1.3-1.5-3-1.5S9 9 9 10s1.3 1.5 3 1.5 3 .5 3 1.5-1.3 1.5-3 1.5S9 14 9 13" />
                  </Icon>
                </span>

                <span>
                  <span className="block text-sm font-semibold text-[#162B3B]">
                    Cash Receipt
                  </span>
                  <span className="text-xs text-[#91A5B3]">
                    Record today's payment
                  </span>
                </span>
              </button>

            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}