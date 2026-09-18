import { useState } from 'react';
import DataModeSettings from '../components/DataModeSettings';
import { PageHeader, Card, Divider, Select } from '../components/ui';

const VOICE_LANGUAGES = [
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
];

export default function Settings() {
  const [voiceLanguage, setVoiceLanguage] = useState(
    localStorage.getItem('doctify_voice_language') || 'mr-IN'
  );

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
          {/* CLINIC */}
          {/* -------------------------------------------------- */}

          <section>
            <Divider label="Clinic & Doctor" />

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
                    🏥
                  </div>

                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: '#1A2B3C' }}
                    >
                      Clinic Information
                    </h3>

                    <p
                      className="text-xs mt-0.5"
                      style={{ color: '#9AAFBF' }}
                    >
                      Clinic name, address and contact details.
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
                  Clinic settings will be added here.
                </div>
              </Card>


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