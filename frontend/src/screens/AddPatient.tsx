import { useState, useEffect} from 'react';
import type { Medicine, Patient, Screen, Visit, User } from '../types';
import { MEDICINE_TYPES, FOLLOW_UP_UNITS } from '../data';
import { createPatientWithVisit, createVisit, addMedicineCatalog, deleteMedicineCatalog, addPreset, deletePreset, searchFamilies, createFamily, type FamilySummary } from '../api/client';
import { Button, Input, Textarea, Select, Card, Badge, Divider } from '../components/ui';
import { EditableDropdown } from '../components/EditableDropdown';
import { listPresets, listMedicineCatalog, type Preset, type CatalogMedicine } from '../api/client';
import { sharePrescriptionPdf } from '../utils/prescriptionPdf';

const MicIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
);

const LANGUAGE_OPTIONS = [
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
];


function emptyMed(): Medicine {
  return {
    id: Date.now().toString(),
    type: 'Tablet',
    name: '',
    language: 'mr-IN',
    instructions: '',
    morning: true,
    afternoon: false,
    night: true,
    timing: 'After',
    quantity: '',
  };
}

interface AddPatientProps {
  onNavigate: (screen: Screen, data?: unknown) => void;
  patient?: Patient | null;
  user: User;
}


function VoicePresetButton({
  language,
  onResult,
}: {
  language: string;
  onResult: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);

  const start = () => {
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Recognition) {
      window.alert('Voice input is not supported in this browser.');
      return;
    }

    if (listening) return;

    const recognition = new Recognition();
    recognition.lang = language || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim();
      if (text) onResult(text);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={start}
      className="mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium"
      style={{
        border: '1px solid #D4E5F0',
        color: listening ? '#2196C9' : '#5A7080',
        background: listening ? '#E8F4FA' : '#fff',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
      </svg>
      {listening ? 'Listening…' : 'Voice input'}
    </button>
  );
}

export default function AddPatient({ onNavigate, patient, user, }: AddPatientProps) {
  const isVisitMode = !!patient;
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [familyMode, setFamilyMode] = useState<'none' | 'existing' | 'new'>('none');
  const [familyQuery, setFamilyQuery] = useState('');
  const [familyResults, setFamilyResults] = useState<FamilySummary[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilySummary | null>(null);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [familyLoading, setFamilyLoading] = useState(false);
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);

  const [voiceLanguage, setVoiceLanguage] = useState('mr-IN');

  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [temp, setTemp] = useState('');

  const [pastHistory, setPastHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [complaints, setComplaints] = useState('');
  const [oe, setOe] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [currentMed, setCurrentMed] = useState<Medicine>(emptyMed());

  const [suggestions, setSuggestions] = useState('');
  const [investigations, setInvestigations] = useState('');
  const [opdMedicine, setOpdMedicine] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [followUpUnit, setFollowUpUnit] = useState('days');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<CatalogMedicine[]>([]);

  // Load the full medicine catalog once, for the autocomplete list.
  useEffect(() => {
    listMedicineCatalog()
      .then((data) => {
        console.log('Medicine catalog loaded:', data);
        setMedicineOptions(data);
      })
      .catch((err) => {
        console.error('Failed to load medicine catalog:', err);
        setMedicineOptions([]);
      });
  }, []);

  // Reload presets whenever the medicine Type or Language changes.
  useEffect(() => {
    listPresets(currentMed.type, currentMed.language)
      .then((data) => {
        console.log('Presets loaded:', currentMed.type, currentMed.language, data);
        setPresets(data);
      })
      .catch((err) => {
        console.error('Failed to load presets:', err);
        setPresets([]);
      });
  }, [currentMed.type, currentMed.language]);

  const applyPreset = (presetId: string) => {
    const p = presets.find(x => String(x.id) === presetId);
    if (!p) return;

    setCurrentMed(m => ({
      ...m,
      instructions: p.label,
      morning: !!p.morning,
      afternoon: !!p.afternoon,
      night: !!p.night,
      timing: p.food_timing === 'Before' ? 'Before' : 'After',
    }));
  };

  const applyPresetByLabel = (label: string) => {
    const p = presets.find(x => x.label === label);
    if (!p) {
      setCurrentMed(m => ({ ...m, instructions: label }));
      return;
    }

    setCurrentMed(m => ({
      ...m,
      instructions: p.label,
      morning: !!p.morning,
      afternoon: !!p.afternoon,
      night: !!p.night,
      timing: p.food_timing === 'Before' ? 'Before' : 'After',
    }));
  };

  const handleAddMedicineToCatalog = async (nameToAdd: string) => {
    const created = await addMedicineCatalog({
      name: nameToAdd,
      type: currentMed.type,
    });

    setMedicineOptions(prev =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );

    setCurrentMed(m => ({ ...m, name: created.name }));
  };

  const handleDeleteMedicineFromCatalog = async (medicine: CatalogMedicine) => {
    await deleteMedicineCatalog(medicine.id);

    setMedicineOptions(prev => prev.filter(x => x.id !== medicine.id));

    if (currentMed.name === medicine.name) {
      setCurrentMed(m => ({ ...m, name: '' }));
    }
  };

  const handleAddPresetToCatalog = async (label: string) => {
    const created = await addPreset({
      medicine_type: currentMed.type,
      language: currentMed.language,
      label,
      morning: currentMed.morning,
      afternoon: currentMed.afternoon,
      night: currentMed.night,
      food_timing: currentMed.timing,
    });

    setPresets(prev => [...prev, created].sort((a, b) => a.id - b.id));
    setCurrentMed(m => ({ ...m, instructions: created.label }));
  };

  const handleDeletePresetFromCatalog = async (preset: Preset) => {
    await deletePreset(preset.id);
    setPresets(prev => prev.filter(x => x.id !== preset.id));

    if (currentMed.instructions === preset.label) {
      setCurrentMed(m => ({ ...m, instructions: '' }));
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
  };

  const handleLanguageChange = (value: string) => {
    setVoiceLanguage(value);
    setCurrentMed(m => ({ ...m, language: value, instructions: '' }));
  };

  const openWhatsApp = async (prescriptionPatient: Patient) => {
    const rawPhone = (prescriptionPatient.phone || '').replace(/\D/g, '');

    if (!rawPhone) {
      throw new Error('This patient does not have a valid phone number.');
    }

    const latestVisit = prescriptionPatient.visits?.[0];

    if (!latestVisit) {
      throw new Error('Save the prescription first, then send it on WhatsApp.');
    }

    await sharePrescriptionPdf(user, prescriptionPatient);
  };

  useEffect(() => {
    if (familyMode !== 'existing') return;
    let cancelled = false;
    setFamilyLoading(true);
    const timer = window.setTimeout(() => {
      searchFamilies(familyQuery.trim())
        .then((families) => {
          if (!cancelled) setFamilyResults(families);
        })
        .catch(() => {
          if (!cancelled) setFamilyResults([]);
        })
        .finally(() => {
          if (!cancelled) setFamilyLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [familyMode, familyQuery]);

  const chooseFamilyMode = (mode: 'none' | 'existing' | 'new') => {
    setFamilyMode(mode);

    if (mode === 'none') {
      setSelectedFamily(null);
      setFamilyQuery('');
      setFamilyResults([]);
      setNewFamilyName('');
      setShowFamilyPicker(false);
      return;
    }

    if (mode === 'existing') {
      setNewFamilyName('');
      setFamilyQuery('');
      setFamilyResults([]);
      setShowFamilyPicker(true);
      return;
    }

    setSelectedFamily(null);
    setFamilyQuery('');
    setFamilyResults([]);
    setShowFamilyPicker(true);
  };

  const selectExistingFamily = (family: FamilySummary) => {
    setSelectedFamily(family);
    setFamilyMode('existing');
    setFamilyQuery('');
    setFamilyResults([]);
    setShowFamilyPicker(false);
  };

  const clearSelectedFamily = () => {
    setSelectedFamily(null);
    setFamilyMode('none');
    setFamilyQuery('');
    setFamilyResults([]);
    setNewFamilyName('');
    setShowFamilyPicker(false);
  };

  const handleCreateFamily = async () => {
    const label = newFamilyName.trim();
    if (!label) return;
    setFamilyLoading(true);
    try {
      const created = await createFamily(label);
      setSelectedFamily(created);
      setFamilyMode('new');
      setShowFamilyPicker(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not create family.');
    } finally {
      setFamilyLoading(false);
    }
  };

  const addMedicine = () => {
    if (!currentMed.name.trim()) return;
    setMedicines(m => [...m, { ...currentMed, id: Date.now().toString() }]);
    setCurrentMed(emptyMed());
  };

  const removeMedicine = (id: string) => setMedicines(m => m.filter(x => x.id !== id));

  const handleSave = async (sendWhatsApp = false) => {
    setSaveError(null);
    setSaving(true);

    try {
      const visit = {
        bp, pulse, spo2, weight, height, temp,
        pastHistory, allergies, complaints, oe, quickNote, diagnosis,
        suggestions, investigations, opdMedicine, followUp, followUpUnit,
        medicines,
      };

      let savedPatient: Patient;

      if (isVisitMode && patient) {
        const createdVisit = await createVisit(patient.id, visit);
        savedPatient = {
          ...patient,
          visits: [createdVisit, ...patient.visits],
        };
      } else {
        savedPatient = await createPatientWithVisit({
          name: name.trim(),
          gender,
          age,
          phone,
          linkWithFamilyId: selectedFamily?.id ?? null,
          visit,
        });
      }

      setSaved(true);

      if (sendWhatsApp) {
        await openWhatsApp(savedPatient);

        // On browsers without file-sharing support, the helper downloads
        // the PDF and opens WhatsApp with a short message.
        window.setTimeout(
          () => onNavigate('patient-details', savedPatient),
          900,
        );
        return;
      }

      window.setTimeout(
        () => onNavigate('patient-details', savedPatient),
        500,
      );
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Could not create or send the prescription PDF.',
      );
    } finally {
      setSaving(false);
    }
  };

  const buildPreviewPatient = (): Patient => {
    const visit: Visit = {
      id: 'draft-visit',
      date: new Date().toISOString().slice(0, 10),
      vitals: { bp, pulse, spo2, weight, height, temp },
      complaints,
      pastHistory,
      allergies,
      oe,
      quickNote,
      diagnosis,
      medicines,
      suggestions,
      investigations,
      opdMedicine,
      followUp,
      followUpUnit,
      pharmacyStatus: 'not-sent',
    };

    return {
      id: 'draft-patient',
      name: name.trim() || 'New Patient',
      age: Number(age) || 0,
      gender: gender as Patient['gender'],
      phone,
      familyId: selectedFamily?.id ?? undefined,
      visits: [visit],
    };
  };

  const handleClear = () => {
    setName(''); setGender('Female'); setAge(''); setPhone('');
    setBp(''); setPulse(''); setSpo2(''); setWeight(''); setHeight(''); setTemp('');
    setPastHistory(''); setAllergies(''); setComplaints(''); setOe(''); setQuickNote(''); setDiagnosis('');
    setMedicines([]); setCurrentMed(emptyMed());
    setSuggestions(''); setInvestigations(''); setOpdMedicine(''); setFollowUp(''); setFollowUpUnit('days');
    setFamilyMode('none'); setFamilyQuery(''); setFamilyResults([]); setSelectedFamily(null); setNewFamilyName(''); setFamilyLoading(false); setShowFamilyPicker(false);
    setVoiceLanguage('mr-IN');
    setSaved(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ padding: 'clamp(16px, 2.5vw, 28px) clamp(16px, 3vw, 32px)' }}>
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1A2B3C' }}>Add Patient / New Prescription</h1>
          <p className="text-[15px] mt-1" style={{ color: '#9AAFBF' }}>Enter patient details and build the prescription below</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: '#F8FBFE', border: '1px solid #D4E5F0' }}
          >
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#5A7080' }}>
              Voice language
            </span>
            <Select
              value={voiceLanguage}
              onChange={e => handleLanguageChange(e.target.value)}
              options={LANGUAGE_OPTIONS}
              className="w-28"
            />
          </div>
          <Button variant="secondary" onClick={handleClear}>Clear Form</Button>
          <Button variant="success" onClick={() => handleSave(false)} disabled={saved || saving} icon={
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />
            </svg>
          }>
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Prescription'}
          </Button>
        </div>
      </div>
      {saveError && (
        <div className="mt-2 text-sm rounded-lg px-3 py-2" style={{ background: '#FDECEC', color: '#DC3545' }}>
          {saveError}
        </div>
      )}

      <div className="flex flex-col gap-5 add-patient-readable">
        {/* Patient Information */}
        <Card className="p-6">
          <Divider label="Patient Information" />
          <div
            className="mt-3 rounded-lg px-3 py-2 flex items-center justify-between gap-3"
            style={{ background: '#F3F9FC', border: '1px solid #E0EDF3' }}
          >
            <span className="text-xs" style={{ color: '#5A7080' }}>
              Microphone input will use <strong style={{ color: '#183247' }}>
                {LANGUAGE_OPTIONS.find(x => x.value === voiceLanguage)?.label}
              </strong> across clinical note fields.
            </span>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#2196C9' }}>
              🎙 {voiceLanguage}
            </span>
          </div>
          <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'minmax(220px, 1fr) 140px 100px minmax(220px, 1fr)' }}>
            <Input label="Full Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Patient full name" />
            <Select
              label="Gender"
              value={gender}
              onChange={e => setGender(e.target.value)}
              options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }, { value: 'Other', label: 'Other' }]}
            />
            <Input label="Age" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Years" />
            <div>
              <Input
                label="Phone *"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
              />
            </div>
          </div>

          {/* Family */}
          <div
            className="mt-4 rounded-2xl p-4 sm:p-5"
            style={{
              background: '#F8FBFE',
              border: '1px solid #D4E5F0',
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#E8F4FA', color: '#2196C9' }}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#1A2B3C' }}>
                      Family
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#7A8D9A' }}>
                      Optional · Link this patient to a family
                    </div>
                  </div>
                </div>
              </div>

              {selectedFamily && (
                <button
                  type="button"
                  onClick={clearSelectedFamily}
                  className="text-xs font-semibold rounded-lg px-2.5 py-1.5"
                  style={{
                    color: '#C0525D',
                    background: '#FFF5F5',
                    border: '1px solid #F2D3D6',
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => chooseFamilyMode('none')}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: familyMode === 'none' && !selectedFamily ? '#E8F4FA' : '#fff',
                  border: `1px solid ${familyMode === 'none' && !selectedFamily ? '#9DD4EA' : '#DCE8EE'}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#1A2B3C' }}>
                    No family
                  </span>
                  {familyMode === 'none' && !selectedFamily && (
                    <span className="text-xs font-bold" style={{ color: '#2196C9' }}>✓</span>
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>
                  Keep patient independent
                </div>
              </button>

              <button
                type="button"
                onClick={() => chooseFamilyMode('existing')}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: selectedFamily ? '#E6F5EE' : '#fff',
                  border: `1px solid ${selectedFamily ? '#B7E4CC' : '#DCE8EE'}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#1A2B3C' }}>
                    {selectedFamily ? selectedFamily.label : 'Existing family'}
                  </span>
                  <span className="text-xs font-bold" style={{ color: selectedFamily ? '#1FA563' : '#2196C9' }}>
                    {selectedFamily ? '✓' : 'Choose'}
                  </span>
                </div>
                <div className="text-xs mt-1 truncate" style={{ color: '#8AA0B0' }}>
                  {selectedFamily
                    ? `${selectedFamily.memberCount} member${selectedFamily.memberCount === 1 ? '' : 's'} · Click to change`
                    : 'Search and select a family'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => chooseFamilyMode('new')}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: familyMode === 'new' && selectedFamily ? '#E6F5EE' : '#fff',
                  border: `1px solid ${familyMode === 'new' && selectedFamily ? '#B7E4CC' : '#DCE8EE'}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#1A2B3C' }}>
                    Create new
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#2196C9' }}>＋</span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#8AA0B0' }}>
                  Start a new family group
                </div>
              </button>
            </div>

            {selectedFamily && (
              <div
                className="mt-3 rounded-xl px-3.5 py-3 flex items-center gap-3"
                style={{
                  background: '#F1FAF5',
                  border: '1px solid #CDEBD9',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#DDF3E6', color: '#1FA563' }}
                >
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold" style={{ color: '#26744D' }}>
                    Family selected
                  </div>
                  <div className="text-sm font-bold truncate" style={{ color: '#1A2B3C' }}>
                    {selectedFamily.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => chooseFamilyMode('existing')}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{ color: '#2196C9', background: '#fff', border: '1px solid #BFE1EF' }}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Family picker modal */}
          {showFamilyPicker && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(17, 37, 50, 0.42)' }}
              onMouseDown={e => {
                if (e.target === e.currentTarget) setShowFamilyPicker(false);
              }}
            >
              <div
                className="w-full max-w-xl rounded-2xl overflow-hidden"
                style={{
                  background: '#fff',
                  boxShadow: '0 24px 70px rgba(17,37,50,0.24)',
                  border: '1px solid #DDEAF1',
                }}
                role="dialog"
                aria-modal="true"
                aria-label={familyMode === 'new' ? 'Create new family' : 'Select existing family'}
              >
                <div
                  className="px-5 py-4 flex items-start justify-between gap-4"
                  style={{ borderBottom: '1px solid #E8F0F4' }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                          background: familyMode === 'new' ? '#FFF4E8' : '#E8F4FA',
                          color: familyMode === 'new' ? '#D97824' : '#2196C9',
                        }}
                      >
                        {familyMode === 'new' ? (
                          <span className="text-lg">＋</span>
                        ) : (
                          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold" style={{ color: '#1A2B3C' }}>
                          {familyMode === 'new' ? 'Create new family' : 'Choose existing family'}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: '#8AA0B0' }}>
                          {familyMode === 'new'
                            ? 'Give this family a simple name.'
                            : 'Search by family name, member name, or phone.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFamilyPicker(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#F5F8FA', color: '#6D8290' }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="p-5">
                  {familyMode === 'existing' ? (
                    <>
                      <Input
                        label="Search family"
                        value={familyQuery}
                        onChange={e => setFamilyQuery(e.target.value)}
                        placeholder="Family, member name or 9876543210"
                        autoFocus
                      />

                      <div className="mt-3">
                        {familyLoading ? (
                          <div
                            className="rounded-xl px-4 py-5 text-center text-sm"
                            style={{ background: '#F7FAFC', color: '#7A8D9A' }}
                          >
                            Searching families…
                          </div>
                        ) : familyResults.length === 0 ? (
                          <div
                            className="rounded-xl px-4 py-7 text-center"
                            style={{ background: '#F7FAFC', border: '1px dashed #DCE8EE' }}
                          >
                            <div className="text-sm font-semibold" style={{ color: '#4E6573' }}>
                              {familyQuery.trim() ? 'No families found' : 'Start typing to search'}
                            </div>
                            <div className="text-xs mt-1" style={{ color: '#94A6B1' }}>
                              {familyQuery.trim()
                                ? 'Try a different family name, member name, or phone.'
                                : 'Only matching families will appear here.'}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1"
                            style={{ scrollbarWidth: 'thin' }}
                          >
                            {familyResults.map(family => (
                              <button
                                key={family.id}
                                type="button"
                                onClick={() => selectExistingFamily(family)}
                                className="w-full text-left rounded-xl p-3.5 transition-all"
                                style={{
                                  background: selectedFamily?.id === family.id ? '#EAF8F0' : '#F9FBFC',
                                  border: `1px solid ${selectedFamily?.id === family.id ? '#B9E4CB' : '#E2EBF0'}`,
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                    style={{
                                      background: selectedFamily?.id === family.id ? '#DDF3E6' : '#E8F4FA',
                                      color: selectedFamily?.id === family.id ? '#1FA563' : '#2196C9',
                                    }}
                                  >
                                    {family.label
                                      .split(' ')
                                      .map(part => part[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-sm font-bold truncate" style={{ color: '#1A2B3C' }}>
                                        {family.label}
                                      </span>
                                      <span className="text-xs whitespace-nowrap" style={{ color: '#7A8D9A' }}>
                                        {family.memberCount} member{family.memberCount === 1 ? '' : 's'}
                                      </span>
                                    </div>

                                    <div className="text-xs mt-1 truncate" style={{ color: '#8295A1' }}>
                                      {family.members.slice(0, 3).map(member => member.name).join(' · ') || 'No members yet'}
                                      {family.members.length > 3 ? ' · …' : ''}
                                    </div>
                                  </div>

                                  <span
                                    className="text-sm font-bold flex-shrink-0"
                                    style={{ color: selectedFamily?.id === family.id ? '#1FA563' : '#9AAFBF' }}
                                  >
                                    {selectedFamily?.id === family.id ? '✓' : '→'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        label="Family name"
                        value={newFamilyName}
                        onChange={e => setNewFamilyName(e.target.value)}
                        placeholder="e.g. Patil Family"
                        autoFocus
                      />

                      <div
                        className="rounded-xl px-3.5 py-3 text-xs"
                        style={{ background: '#FFF9F2', border: '1px solid #F4E2C9', color: '#8A6A48' }}
                      >
                        You can add more patients to this family later from the Families screen.
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowFamilyPicker(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreateFamily}
                          disabled={!newFamilyName.trim() || familyLoading}
                        >
                          {familyLoading ? 'Creating…' : 'Create Family'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Vitals */}
        <Card className="p-6">
          <Divider label="Vitals" />
          <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[
              { label: 'BP (mmHg)', value: bp, set: setBp, placeholder: '120/80' },
              { label: 'Pulse (bpm)', value: pulse, set: setPulse, placeholder: '72' },
              { label: 'SPO2 (%)', value: spo2, set: setSpo2, placeholder: '98' },
              { label: 'Weight (kg)', value: weight, set: setWeight, placeholder: '65' },
              { label: 'Height (cm)', value: height, set: setHeight, placeholder: '165' },
              { label: 'Temp (°C)', value: temp, set: setTemp, placeholder: '37.0' },
            ].map(v => (
              <Input key={v.label} label={v.label} value={v.value} onChange={e => v.set(e.target.value)} placeholder={v.placeholder} />
            ))}
          </div>
        </Card>

        {/* Clinical notes */}
        <Card className="p-6">
          <Divider label="Clinical Notes" />
          <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <Textarea label="Past History" voiceLanguage={voiceLanguage} value={pastHistory} onChange={e => setPastHistory(e.target.value)} rows={3} placeholder="e.g. Hypertension, Diabetes…" />
            <Textarea label="Known Allergies" voiceLanguage={voiceLanguage} value={allergies} onChange={e => setAllergies(e.target.value)} rows={3} placeholder="e.g. Penicillin, Dust…" />
            <Textarea label="Chief Complaints *" voiceLanguage={voiceLanguage} value={complaints} onChange={e => setComplaints(e.target.value)} rows={3} placeholder="Patient's presenting complaints…" />
            <Textarea label="On Examination (O/E)" voiceLanguage={voiceLanguage} value={oe} onChange={e => setOe(e.target.value)} rows={3} placeholder="Clinical findings…" />
            <Textarea label="Quick Note" voiceLanguage={voiceLanguage} value={quickNote} onChange={e => setQuickNote(e.target.value)} rows={2} placeholder="Internal note (not printed)…" />
            <Textarea label="Diagnosis *" voiceLanguage={voiceLanguage} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder="Working / final diagnosis…" />
          </div>
        </Card>

        {/* Rx Medicines Builder */}
        <Card className="p-6">
          <Divider label="Rx Medicines" />

          <div className="mt-4">
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: '#F8FBFE',
                border: '1.5px dashed #D4E5F0',
              }}
            >
              {/* Top medicine row */}
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: '160px minmax(220px, 1fr) 170px minmax(240px, 1fr)',
                }}
              >
                <Select
                  label="Type"
                  value={currentMed.type}
                  onChange={e =>
                    setCurrentMed(m => ({
                      ...m,
                      type: e.target.value,
                      name: '',
                      instructions: '',
                    }))
                  }
                  options={MEDICINE_TYPES.map(type => ({
                    value: type,
                    label: type,
                  }))}
                />

                <EditableDropdown
                  label="Medicine Name *"
                  value={currentMed.name}
                  items={medicineOptions.filter(med => med.type === currentMed.type)}
                  getKey={med => med.id}
                  getLabel={med => med.name}
                  onChange={value => setCurrentMed(m => ({ ...m, name: value }))}
                  onSelect={med => setCurrentMed(m => ({ ...m, name: med.name }))}
                  onAdd={handleAddMedicineToCatalog}
                  onDelete={handleDeleteMedicineFromCatalog}
                  placeholder="e.g. Paracetamol 500mg"
                  emptyText={`No ${currentMed.type} medicines found`}
                  addText="Add medicine"
                />

                <Select
                  label="Prescription Language"
                  value={currentMed.language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  options={LANGUAGE_OPTIONS}
                />

                <EditableDropdown
                  label="Preset Instructions"
                  value={currentMed.instructions}
                  items={presets}
                  getKey={p => p.id}
                  getLabel={p => p.label}
                  onChange={value => applyPresetByLabel(value)}
                  onSelect={p => applyPreset(String(p.id))}
                  onAdd={handleAddPresetToCatalog}
                  onDelete={handleDeletePresetFromCatalog}
                  placeholder="e.g. 1 tablet after breakfast"
                  emptyText="No presets for this type and language"
                  addText="Add preset"
                />

                <div className="mt-1 text-[11px]" style={{ color: '#9AAFBF' }}>
                  Select a preset to auto-fill dosage and timing. You can also add or delete presets here.
                </div>

                <VoicePresetButton
                  language={currentMed.language}
                  onResult={text => applyPresetByLabel(
                    currentMed.instructions ? `${currentMed.instructions} ${text}` : text
                  )}
                />

              </div>

              {/* Bottom medicine row */}
              <div className="flex items-end gap-6 mt-4">
                <div>
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: '#5A7080' }}
                  >
                    Dosage (M / A / N)
                  </div>

                  <div className="flex gap-3">
                    {(['morning', 'afternoon', 'night'] as const).map(slot => (
                      <label
                        key={slot}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={currentMed[slot]}
                          onChange={e =>
                            setCurrentMed(m => ({
                              ...m,
                              [slot]: e.target.checked,
                            }))
                          }
                          style={{
                            accentColor: '#2196C9',
                            width: 18,
                            height: 18,
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: '#5A7080' }}
                        >
                          {slot[0].toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: '#5A7080' }}
                  >
                    Timing
                  </div>

                  <div className="flex gap-3">
                    {(['Before', 'After'] as const).map(t => (
                      <label
                        key={t}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="timing"
                          checked={currentMed.timing === t}
                          onChange={() =>
                            setCurrentMed(m => ({
                              ...m,
                              timing: t,
                            }))
                          }
                          style={{
                            accentColor: '#2196C9',
                            width: 18,
                            height: 18,
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: '#5A7080' }}
                        >
                          {t} food
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="Quantity"
                  value={currentMed.quantity}
                  onChange={e =>
                    setCurrentMed(m => ({
                      ...m,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder="e.g. 10"
                  className="w-28"
                />

                <Button
                  variant="primary"
                  onClick={addMedicine}
                  disabled={!currentMed.name.trim()}
                  icon={
                    <svg
                      width={13}
                      height={13}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  }
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Added medicines list */}
            {medicines.length === 0 ? (
              <div
                className="text-sm text-center py-6"
                style={{ color: '#9AAFBF' }}
              >
                No medicines added yet
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid #E5EEF4' }}
              >
                <table className="w-full">
                  <thead style={{ background: '#F8FBFE' }}>
                    <tr>
                      {[
                        '#',
                        'Type',
                        'Medicine',
                        'Instructions',
                        'Dosage',
                        'Timing',
                        'Qty',
                        '',
                      ].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-xs font-semibold"
                          style={{ color: '#9AAFBF' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {medicines.map((m, i) => (
                      <tr
                        key={m.id}
                        style={{ borderTop: '1px solid #F0F6FA' }}
                      >
                        <td
                          className="px-4 py-2.5 text-xs"
                          style={{ color: '#9AAFBF' }}
                        >
                          {i + 1}
                        </td>

                        <td className="px-4 py-2.5">
                          <Badge variant="gray">{m.type}</Badge>
                        </td>

                        <td
                          className="px-4 py-2.5 text-sm font-medium"
                          style={{ color: '#1A2B3C' }}
                        >
                          {m.name}
                        </td>

                        <td
                          className="px-4 py-2.5 text-xs"
                          style={{ color: '#5A7080' }}
                        >
                          {m.instructions || '-'}
                        </td>

                        <td
                          className="px-4 py-2.5 text-xs font-mono"
                          style={{ color: '#5A7080' }}
                        >
                          {[m.morning ? 'M' : '-', m.afternoon ? 'A' : '-', m.night ? 'N' : '-'].join('-')}
                        </td>

                        <td
                          className="px-4 py-2.5 text-xs"
                          style={{ color: '#5A7080' }}
                        >
                          {m.timing} food
                        </td>

                        <td
                          className="px-4 py-2.5 text-xs"
                          style={{ color: '#5A7080' }}
                        >
                          {m.quantity || '-'}
                        </td>

                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => removeMedicine(m.id)}
                            style={{ color: '#DC3545', lineHeight: 0 }}
                          >
                            <svg
                              width={14}
                              height={14}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Other fields */}
        <Card className="p-6">
          <Divider label="Additional Details" />
          <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <Textarea label="Suggestions / Advice" voiceLanguage={voiceLanguage} value={suggestions} onChange={e => setSuggestions(e.target.value)} rows={3} placeholder="Diet, lifestyle advice…" />
            <Textarea label="Investigations" voiceLanguage={voiceLanguage} value={investigations} onChange={e => setInvestigations(e.target.value)} rows={3} placeholder="CBC, X-Ray, USG…" />
            <Textarea label="OPD Medicine" voiceLanguage={voiceLanguage} value={opdMedicine} onChange={e => setOpdMedicine(e.target.value)} rows={3} placeholder="Dispensed from OPD stock…" />
          </div>

          <div className="flex items-end gap-4 mt-4">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: '#5A7080' }}>Follow-up</div>
              <div className="flex items-center gap-2">
                <Input value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="e.g. 5" className="w-20" />
                <Select
                  value={followUpUnit}
                  onChange={e => setFollowUpUnit(e.target.value)}
                  options={FOLLOW_UP_UNITS.map(u => ({ value: u, label: u }))}
                  className="w-28"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Pharmacy status strip */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9AAFBF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
              <div>
                <div className="text-xs font-semibold" style={{ color: '#9AAFBF' }}>Pharmacy Status</div>
                <Badge variant="gray">Not sent to pharmacy</Badge>
              </div>
            </div>
            <Button variant="secondary" disabled>Send to linked pharmacy</Button>
          </div>
        </Card>

        {/* Save/clear bottom */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button variant="secondary" onClick={() => onNavigate('print-preview', buildPreviewPatient())} icon={
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
            </svg>
          }>
            Preview & Print
          </Button>
          <Button variant="secondary" onClick={handleClear}>Clear Form</Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(true)}
            disabled={saved || saving}
          >
            {saving ? 'Preparing PDF...' : 'Save & WhatsApp'}
          </Button>
          <Button variant="success" onClick={() => handleSave(false)} disabled={saved || saving}>
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Prescription'}
          </Button>
        </div>
      </div>
    </div>
  );
}
