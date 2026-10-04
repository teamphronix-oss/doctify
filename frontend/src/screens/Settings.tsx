import { useState } from 'react';
import type { User, Clinic } from '../types';
import DataModeSettings from '../components/DataModeSettings';
import { PageHeader, Card, Divider, Select, Button, Input } from '../components/ui';
import { addClinic, updateClinic, deleteClinic, selectClinic, type ClinicDetailsPayload } from '../api/client';

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

// Styles the native file input's button part so it visibly looks
// clickable (blue), instead of the plain unstyled "Choose File" text.
const FILE_INPUT_CLASS =
  'block text-xs cursor-pointer file:mr-3 file:cursor-pointer file:rounded-lg ' +
  'file:border-0 file:bg-[#2196C9] file:px-3 file:py-2 file:text-xs ' +
  'file:font-semibold file:text-white hover:file:bg-[#1A7FA8]';

const MAX_BANNER_WIDTH = 1000;

// Shrinks/compresses whatever image the doctor picks before it's sent to
// the backend - a straight-from-camera letterhead photo can be several
// MB, which is unnecessary for a header that prints at a few hundred
// pixels wide. Shared by both the Add and Edit clinic forms.
function resizeBannerFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_BANNER_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not process image.')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Could not read image.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

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
  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerProcessing, setBannerProcessing] = useState(false);

  // Editing an existing clinic (separate from the Add form above).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClinicDetailsPayload>(EMPTY_CLINIC_FORM);
  const [editBannerPreview, setEditBannerPreview] = useState('');
  const [editBannerProcessing, setEditBannerProcessing] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const handleBannerFile = async (file: File | null) => {
    if (!file) return;
    setAddError('');
    setBannerProcessing(true);
    try {
      const dataUrl = await resizeBannerFile(file);
      setNewClinic(prev => ({ ...prev, bannerImage: dataUrl }));
      setBannerPreview(dataUrl);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      setBannerProcessing(false);
    }
  };

  const startEdit = (clinic: Clinic) => {
    setDeleteError('');
    setEditingId(clinic.id);
    setEditForm({
      name: clinic.name,
      address: clinic.address,
      doctorName: clinic.doctorName,
      qualification: clinic.qualification,
      regNo: clinic.regNo,
      bannerImage: clinic.bannerImage || '',
    });
    setEditBannerPreview(clinic.bannerImage || '');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleEditBannerFile = async (file: File | null) => {
    if (!file) return;
    setEditError('');
    setEditBannerProcessing(true);
    try {
      const dataUrl = await resizeBannerFile(file);
      setEditForm(prev => ({ ...prev, bannerImage: dataUrl }));
      setEditBannerPreview(dataUrl);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      setEditBannerProcessing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) {
      setEditError('Clinic name is required.');
      return;
    }
    setEditError('');
    setEditSaving(true);
    try {
      const updated = await updateClinic(editingId, editForm);
      onClinicsChanged(user.clinics.map(c => (c.id === updated.id ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteClinic = async (clinic: Clinic) => {
    if (user.clinics.length <= 1) return; // button is disabled for this case anyway
    if (!window.confirm(
      `Remove "${clinic.name}"? Its patients and records are kept, but you will no longer be able to open this clinic.`
    )) return;

    setDeleteError('');
    setDeletingId(clinic.id);
    try {
      await deleteClinic(clinic.id);
      const remaining = user.clinics.filter(c => c.id !== clinic.id);

      if (clinic.id === user.activeClinic.id) {
        // We just removed the clinic we were sitting in - open another
        // one of the doctor's clinics so the app isn't left pointing at
        // a clinic that no longer opens.
        const next = remaining[0];
        await selectClinic(next.id);
        onClinicsChanged(remaining, next.id);
      } else {
        onClinicsChanged(remaining);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove clinic.');
    } finally {
      setDeletingId(null);
    }
  };

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
      setBannerPreview('');
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

                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A7080' }}>
                      Prescription Header Banner (optional)
                    </label>
                    <p className="text-xs mb-2" style={{ color: '#9AAFBF' }}>
                      Upload a letterhead image (clinic name, logo, address,
                      doctor details) and it will be printed at the top of
                      every prescription for this clinic, instead of the
                      plain text header.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleBannerFile(e.target.files?.[0] ?? null)}
                      className={FILE_INPUT_CLASS}
                    />
                    {bannerProcessing && (
                      <div className="text-xs mt-2" style={{ color: '#9AAFBF' }}>Processing image…</div>
                    )}
                    {bannerPreview && !bannerProcessing && (
                      <div className="mt-2 rounded-lg border p-2" style={{ borderColor: '#D4E5F0', background: '#fff' }}>
                        <img src={bannerPreview} alt="Banner preview" style={{ maxWidth: '100%', maxHeight: 120, display: 'block' }} />
                      </div>
                    )}
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

              {deleteError && (
                <div className="text-xs rounded-lg px-3 py-2 mb-3" style={{ background: '#FDEEEE', color: '#DC3545' }}>
                  {deleteError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {user.clinics.map(clinic => {
                  const isActive = clinic.id === user.activeClinic.id;
                  const isEditing = editingId === clinic.id;
                  const onlyClinic = user.clinics.length <= 1;

                  return (
                    <div
                      key={clinic.id}
                      className="rounded-xl p-3"
                      style={{
                        border: isActive ? '1px solid #2196C9' : '1px solid #D4E5F0',
                        background: isActive ? '#E8F4FA' : '#fff',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
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

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isActive && (
                            <span className="text-xs font-semibold px-2" style={{ color: '#2196C9' }}>
                              Active
                            </span>
                          )}
                          {!isActive && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSwitch(clinic.id)}
                              disabled={switchingId === clinic.id}
                            >
                              {switchingId === clinic.id ? 'Switching…' : 'Switch'}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => (isEditing ? cancelEdit() : startEdit(clinic))}
                          >
                            {isEditing ? 'Cancel' : 'Edit'}
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClinic(clinic)}
                            disabled={onlyClinic || deletingId === clinic.id}
                            title={onlyClinic ? 'Your only clinic cannot be removed' : 'Remove clinic'}
                            className="text-xs font-medium px-2 py-1.5 rounded-lg"
                            style={{
                              color: onlyClinic ? '#C7D3DB' : '#DC3545',
                              cursor: onlyClinic ? 'not-allowed' : 'pointer',
                              background: 'transparent',
                            }}
                          >
                            {deletingId === clinic.id ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div
                          className="rounded-xl p-4 mt-3 flex flex-col gap-3"
                          style={{ background: '#F7FAFC', border: '1px solid #D4E5F0' }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              label="Clinic Name"
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            />
                            <Input
                              label="Address"
                              value={editForm.address}
                              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            />
                            <Input
                              label="Doctor Name"
                              value={editForm.doctorName}
                              onChange={e => setEditForm({ ...editForm, doctorName: e.target.value })}
                            />
                            <Input
                              label="Qualification"
                              value={editForm.qualification}
                              onChange={e => setEditForm({ ...editForm, qualification: e.target.value })}
                            />
                            <Input
                              label="Registration No."
                              value={editForm.regNo}
                              onChange={e => setEditForm({ ...editForm, regNo: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium block mb-1.5" style={{ color: '#5A7080' }}>
                              Prescription Header Banner (optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => handleEditBannerFile(e.target.files?.[0] ?? null)}
                              className={FILE_INPUT_CLASS}
                            />
                            {editBannerProcessing && (
                              <div className="text-xs mt-2" style={{ color: '#9AAFBF' }}>Processing image…</div>
                            )}
                            {editBannerPreview && !editBannerProcessing && (
                              <div className="mt-2 rounded-lg border p-2" style={{ borderColor: '#D4E5F0', background: '#fff' }}>
                                <img src={editBannerPreview} alt="Banner preview" style={{ maxWidth: '100%', maxHeight: 120, display: 'block' }} />
                              </div>
                            )}
                          </div>

                          {editError && (
                            <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#FDEEEE', color: '#DC3545' }}>
                              {editError}
                            </div>
                          )}

                          <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={editSaving} className="self-start">
                            {editSaving ? 'Saving…' : 'Save Changes'}
                          </Button>
                        </div>
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