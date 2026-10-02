import { useState } from 'react';
import type { User, Clinic } from '../types';
import DataModeSettings from '../components/DataModeSettings';
import { PageHeader, Card, Divider, Select, Button, Input } from '../components/ui';
import { addClinic, selectClinic, type ClinicDetailsPayload } from '../api/client';

const VOICE_LANGUAGES = [
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
];

interface SettingsProps {
  user: User;
  onClinicSwitched: (clinicId: string) => void;
  onClinicsChanged: (clinics: Clinic[], activeClinicId?: string) => void;
}

const EMPTY_CLINIC_FORM: ClinicDetailsPayload = {
  name: '', address: '', doctorName: '', qualification: '', regNo: '',
};

export default function Settings({ user, onClinicSwitched, onClinicsChanged }: SettingsProps) {
  const [voiceLanguage, setVoiceLanguage] = useState(
    localStorage.getItem('doctify_voice_language') || 'mr-IN'
  );

  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newClinic, setNewClinic] = useState<ClinicDetailsPayload>(EMPTY_CLINIC_FORM);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSwitch = async (clinicId: string) => {
    if (clinicId === user.activeClinic.id) return;
    setSwitchError('');
    setSwitchingId(clinicId);
    try {
      // Confirmed with the backend (and a fresh token issued) before we
      // tell the rest of the app to show this clinic's data.
      await selectClinic(clinicId);
      onClinicSwitched(clinicId);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Could not switch clinic.');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddClinic = async () => {
    if (!newClinic.name.trim()) {
      setAddError('Clinic name is required.');
      return;
    }
    setAddError('');
    setAdding(true);
    try {
      // Starts completely empty - its own patients, visits, receipts etc.,
      // separate from every other clinic this doctor has.
      const created = await addClinic(newClinic);
      onClinicsChanged([...user.clinics, created]);
      setNewClinic(EMPTY_CLINIC_FORM);
      setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add clinic.');
    } finally {
      setAdding(false);
    }
  };

  const handleVoiceLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;

    setVoiceLanguage(value);
    localStorage.setItem('doctify_voice_language', value);
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: '#EFF6FB' }}
    >
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: 1100,
          padding: '28px 32px 40px',
        }}
      >
        <PageHeader
          title="Settings"
          subtitle="Manage your Doctify system, voice input and data preferences."
        />

        <div className="flex flex-col gap-5">

          {/* -------------------------------------------------- */}
          {/* DATA & SYNC */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="Data & Sync" />

            <div className="mt-4">
              <DataModeSettings />
            </div>
          </section>


          {/* -------------------------------------------------- */}
          {/* VOICE INPUT */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="Voice Input" />

            <Card className="p-6 mt-4">
              <div className="flex items-start gap-4">

                <div
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: '#E8F4FA',
                    color: '#2196C9',
                  }}
                >
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <path d="M12 19v4" />
                    <path d="M8 23h8" />
                  </svg>
                </div>

                <div className="flex-1">
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: '#1A2B3C' }}
                  >
                    Voice Input Language
                  </h2>

                  <p
                    className="text-xs mt-1 mb-4"
                    style={{ color: '#5A7080' }}
                  >
                    Choose the language the doctor normally speaks when using
                    the microphone.
                  </p>

                  <div style={{ maxWidth: 280 }}>
                    <Select
                      label="Default language"
                      value={voiceLanguage}
                      onChange={handleVoiceLanguageChange}
                      options={VOICE_LANGUAGES}
                    />
                  </div>

                  <div
                    className="mt-3 rounded-lg px-3 py-2"
                    style={{
                      background: '#F5F9FC',
                      color: '#5A7080',
                      fontSize: 12,
                    }}
                  >
                    This setting is saved on this computer and will be used
                    as the default voice language.
                  </div>
                </div>

              </div>
            </Card>
          </section>


          {/* -------------------------------------------------- */}
          {/* CLINICS */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="My Clinics" />

            <Card className="p-5 mt-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <p className="text-xs" style={{ color: '#5A7080' }}>
                  Switch to another clinic you have access to, or add a new
                  one. Each clinic's patients, visits and records are kept
                  completely separate.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setShowAddForm(v => !v); setAddError(''); }}
                >
                  {showAddForm ? 'Cancel' : '+ Add Clinic'}
                </Button>
              </div>

              {showAddForm && (
                <div
                  className="rounded-xl p-4 mb-4 flex flex-col gap-3"
                  style={{ background: '#F7FAFC', border: '1px solid #D4E5F0' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Clinic Name"
                      value={newClinic.name}
                      onChange={e => setNewClinic({ ...newClinic, name: e.target.value })}
                      placeholder="e.g. Sunrise Clinic, Pune Branch"
                    />
                    <Input
                      label="Address"
                      value={newClinic.address}
                      onChange={e => setNewClinic({ ...newClinic, address: e.target.value })}
                      placeholder="Clinic address"
                    />
                    <Input
                      label="Doctor Name"
                      value={newClinic.doctorName}
                      onChange={e => setNewClinic({ ...newClinic, doctorName: e.target.value })}
                      placeholder="Printed on prescriptions"
                    />
                    <Input
                      label="Qualification"
                      value={newClinic.qualification}
                      onChange={e => setNewClinic({ ...newClinic, qualification: e.target.value })}
                      placeholder="e.g. MBBS, MD"
                    />
                    <Input
                      label="Registration No."
                      value={newClinic.regNo}
                      onChange={e => setNewClinic({ ...newClinic, regNo: e.target.value })}
                      placeholder="Medical registration number"
                    />
                  </div>

                  {addError && (
                    <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#FDEEEE', color: '#DC3545' }}>
                      {addError}
                    </div>
                  )}

                  <Button variant="primary" size="sm" onClick={handleAddClinic} disabled={adding} className="self-start">
                    {adding ? 'Creating…' : 'Create Clinic'}
                  </Button>
                </div>
              )}

              {switchError && (
                <div className="text-xs rounded-lg px-3 py-2 mb-3" style={{ background: '#FDEEEE', color: '#DC3545' }}>
                  {switchError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {user.clinics.map(clinic => {
                  const isActive = clinic.id === user.activeClinic.id;
                  return (
                    <div
                      key={clinic.id}
                      className="flex items-center justify-between gap-3 rounded-xl p-3"
                      style={{
                        border: isActive ? '1px solid #2196C9' : '1px solid #D4E5F0',
                        background: isActive ? '#E8F4FA' : '#fff',
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#1A2B3C' }}>
                          {clinic.name}
                          {clinic.code && (
                            <span className="ml-2 text-xs font-normal" style={{ color: '#9AAFBF' }}>
                              {clinic.code}
                            </span>
                          )}
                        </div>
                        {clinic.address && (
                          <div className="text-xs mt-0.5" style={{ color: '#5A7080' }}>{clinic.address}</div>
                        )}
                      </div>

                      {isActive ? (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#2196C9' }}>
                          Active
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSwitch(clinic.id)}
                          disabled={switchingId === clinic.id}
                        >
                          {switchingId === clinic.id ? 'Switching…' : 'Switch'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>


          {/* -------------------------------------------------- */}
          {/* DOCTOR */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="Doctor" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

              <Card className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="rounded-lg flex items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      background: '#E8F4FA',
                      color: '#2196C9',
                    }}
                  >
                    👨‍⚕️
                  </div>

                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: '#1A2B3C' }}
                    >
                      Doctor Information
                    </h3>

                    <p
                      className="text-xs mt-0.5"
                      style={{ color: '#9AAFBF' }}
                    >
                      Doctor name, qualification and registration details.
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    background: '#F7FAFC',
                    color: '#9AAFBF',
                    fontSize: 12,
                  }}
                >
                  Doctor settings will be added here.
                </div>
              </Card>

            </div>
          </section>


          {/* -------------------------------------------------- */}
          {/* PRESCRIPTION */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="Prescription" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

              <Card className="p-5">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: '#1A2B3C' }}
                >
                  💊 Medicine & Presets
                </h3>

                <p
                  className="text-xs mt-1"
                  style={{ color: '#5A7080' }}
                >
                  Manage medicines and prescription instructions available
                  in the Add Patient screen.
                </p>

                <div
                  className="mt-4 rounded-lg px-3 py-2.5"
                  style={{
                    background: '#F7FAFC',
                    color: '#9AAFBF',
                    fontSize: 12,
                  }}
                >
                  Medicine and preset management will be added here.
                </div>
              </Card>


              <Card className="p-5">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: '#1A2B3C' }}
                >
                  🖨️ Prescription Printing
                </h3>

                <p
                  className="text-xs mt-1"
                  style={{ color: '#5A7080' }}
                >
                  Configure prescription layout, footer and printing options.
                </p>

                <div
                  className="mt-4 rounded-lg px-3 py-2.5"
                  style={{
                    background: '#F7FAFC',
                    color: '#9AAFBF',
                    fontSize: 12,
                  }}
                >
                  Printing settings will be added here.
                </div>
              </Card>

            </div>
          </section>


          {/* -------------------------------------------------- */}
          {/* BACKUP */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="Backup & Security" />

            <Card className="p-5 mt-4">
              <h3
                className="text-sm font-semibold"
                style={{ color: '#1A2B3C' }}
              >
                💾 Backup & Restore
              </h3>

              <p
                className="text-xs mt-1"
                style={{ color: '#5A7080' }}
              >
                Create a backup of your local Doctify data or restore an
                existing backup.
              </p>

              <div
                className="mt-4 rounded-lg px-3 py-2.5"
                style={{
                  background: '#F7FAFC',
                  color: '#9AAFBF',
                  fontSize: 12,
                }}
              >
                Backup and restore will be added here.
              </div>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}