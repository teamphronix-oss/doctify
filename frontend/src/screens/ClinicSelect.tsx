import { useState } from 'react';
import type { Clinic } from '../types';
import { Button } from '../components/ui';
import { selectClinic } from '../api/client';

interface ClinicSelectProps {
  clinics: Clinic[];
  // The clinic hospital code actually logged into - selecting it needs
  // no extra API call, since the login token already opened it.
  initialClinicId: string;
  onSelect: (clinic: Clinic) => void;
}

// Shown right after login, ONLY when this doctor has more than one
// clinic (App.tsx decides that). One clinic -> straight to dashboard.
export default function ClinicSelect({ clinics, initialClinicId, onSelect }: ClinicSelectProps) {
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePick = async (clinic: Clinic) => {
    if (clinic.id === initialClinicId) {
      onSelect(clinic);
      return;
    }
    setError('');
    setSwitchingId(clinic.id);
    try {
      const opened = await selectClinic(clinic.id);
      onSelect(opened);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this clinic.');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EFF6FB 0%, #D4E5F0 100%)' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-xl overflow-hidden" style={{ background: '#fff' }}>
          <div className="px-8 py-6" style={{ background: '#0F2133' }}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ width: 36, height: 36, background: '#2196C9' }}>OPD</div>
              <div>
                <div className="text-white font-semibold">Select Clinic</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>You have access to {clinics.length} clinics</div>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-3">
            {error && (
              <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#FDEEEE', color: '#DC3545' }}>
                {error}
              </div>
            )}

            {clinics.map(clinic => (
              <button
                key={clinic.id}
                type="button"
                disabled={switchingId !== null}
                onClick={() => handlePick(clinic)}
                className="w-full text-left rounded-xl p-4 border transition-all"
                style={{ borderColor: '#D4E5F0', opacity: switchingId && switchingId !== clinic.id ? 0.5 : 1 }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = '#2196C9';
                  el.style.background = '#E8F4FA';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = '#D4E5F0';
                  el.style.background = 'transparent';
                }}
              >
                <div className="font-semibold text-sm" style={{ color: '#1A2B3C' }}>
                  {clinic.name}
                  {switchingId === clinic.id && (
                    <span className="ml-2 text-xs font-normal" style={{ color: '#2196C9' }}>Opening…</span>
                  )}
                </div>
                {clinic.address && (
                  <div className="text-xs mt-1" style={{ color: '#5A7080' }}>{clinic.address}</div>
                )}
                {(clinic.doctorName || clinic.qualification) && (
                  <div className="text-xs mt-1" style={{ color: '#9AAFBF' }}>
                    {[clinic.doctorName, clinic.qualification].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
