import { useState } from 'react';
import { Button, Input } from '../components/ui';
import AdminResetPanel from '../components/AdminResetPanel';

// EDIT THIS: how a doctor should reach you to get their PIN reset.
// Shown when they click "Forgot PIN?" below - no email/OTP flow by
// design, since only the admin (you) can reset a PIN (see backend/src/db/resetPin.js).
//const ADMIN_CONTACT = 'Call/WhatsApp +91-XXXXXXXXXX or email you@example.com';
import { login as loginApi, type LoginResult } from '../api/client';

interface LoginProps {
  onLogin: (result: LoginResult) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [hospitalCode, setHospitalCode] = useState('DEMO001');
  const [userCode, setUserCode] = useState('DR001');
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!hospitalCode || !userCode || !pin) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      // Real backend check: only succeeds if this hospital code, user
      // code and PIN combination actually exists (and is active) in
      // the database. hospitalCode picks exactly which clinic opens -
      // switching to another of this doctor's clinics afterwards (no
      // hospital code needed) happens later, from Settings.
      const result = await loginApi({ hospitalCode, userCode, pin });
      onLogin(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #EFF6FB 0%, #D4E5F0 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14" style={{ background: '#0F2133' }}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl flex items-center justify-center font-bold text-white" style={{ width: 44, height: 44, background: '#2196C9', fontSize: 14 }}>OPD</div>
          <div>
            <div className="text-white font-bold text-lg">Patient Records</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Outpatient Management System</div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Streamlined care.<br />
            <span style={{ color: '#2196C9' }}>Every patient.</span>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
            Fast prescription entry, voice input, multi-language support, and family linking — built for busy Indian clinics.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {['Multi-clinic support', 'Voice-enabled data entry', 'Marathi & regional language Rx', 'Linked pharmacy workflow'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 20, height: 20, background: 'rgba(33,150,201,0.2)' }}>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#2196C9" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>© 2026 OPD Patient Records · Secure clinic workflow</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#1A2B3C' }}>Sign in</h2>
            <p className="text-sm mt-1" style={{ color: '#9AAFBF' }}>Use your hospital and user credentials</p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              label="Hospital Code"
              value={hospitalCode}
              onChange={e => setHospitalCode(e.target.value)}
              placeholder="e.g. SGC2024"
              icon={
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />
                </svg>
              }
            />
            <Input
              label="User Code"
              value={userCode}
              onChange={e => setUserCode(e.target.value)}
              placeholder="e.g. DR001"
              icon={
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                </svg>
              }
            />
            <Input
              label="PIN"
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN"
              maxLength={6}
              icon={
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              }
              trailingIcon={
                <button type="button" onClick={() => setShowPin(s => !s)} style={{ lineHeight: 0 }}>
                  {showPin
                    ? <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                    : <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              }
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />

            {error && <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#FDEEEE', color: '#DC3545' }}>{error}</div>}

            <Button variant="primary" size="lg" onClick={handleLogin} disabled={loading} className="w-full mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPin(v => !v)}
                className="text-xs underline-offset-2 hover:underline"
                style={{ color: '#9AAFBF' }}
              >
                Forgot PIN? 
              </button>
            </div>

            {showForgotPin && (
              <AdminResetPanel onClose={() => setShowForgotPin(false)} />
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
