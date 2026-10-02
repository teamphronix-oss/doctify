import { useEffect, useState } from 'react';
import type { Screen, User, Patient } from './types';
import { clearToken, type LoginResult } from './api/client';

import Sidebar from './components/Sidebar';
import Reports from './screens/Reports';

import Login from './screens/Login';
import ClinicSelect from './screens/ClinicSelect';
import Dashboard from './screens/Dashboard';
import AddPatient from './screens/AddPatient';
import PatientSearch from './screens/PatientSearch';
import PatientDetails from './screens/PatientDetails';
import PrintPreview from './screens/PrintPreview';

import Families from './screens/Families';
import FamilyDetails from './screens/FamilyDetails';

import CertificateScreen from './screens/Certificate';
import CashReceipt from './screens/CashReceipt';
import ReferenceLetter from './screens/ReferenceLetter';
import Settings from './screens/Settings';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [screenData, setScreenData] = useState<unknown>(null);
  // Set right after login when this doctor has MORE THAN ONE clinic -
  // ClinicSelect is shown until they pick one. A doctor with exactly one
  // clinic never sees this; they go straight to the dashboard.
  const [choosingClinic, setChoosingClinic] = useState(false);

  const navigate = (s: Screen, data?: unknown) => {
    setScreen(s);
    setScreenData(data ?? null);
  };

  const handleLogin = (result: LoginResult) => {
    const activeClinic =
      result.clinics.find(clinic => clinic.id === result.activeClinicId) ??
      result.clinics[0];

    setUser({
      name: result.userName,
      role: result.role,
      clinics: result.clinics,
      activeClinic,
    });

    setLoggedIn(true);

    if (result.clinics.length > 1) {
      // Which clinic to actually open is decided on the ClinicSelect
      // screen below, not here.
      setChoosingClinic(true);
      return;
    }

    setScreen('dashboard');
    setScreenData(null);
  };

  // The doctor picked a clinic on the post-login ClinicSelect screen.
  const handleClinicChosen = (clinic: User['activeClinic']) => {
    setUser(prev => (prev ? { ...prev, activeClinic: clinic } : prev));
    setChoosingClinic(false);
    setScreen('dashboard');
    setScreenData(null);
  };

  // Switches to another of this doctor's own clinics WITHOUT logging out
  // (Settings calls this after the backend confirms access + issues a
  // token for the new clinic). Every screen's API calls pick up the new
  // clinic automatically, since they all use that token.
  const handleClinicSwitched = (clinicId: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const activeClinic = prev.clinics.find(c => c.id === clinicId);
      return activeClinic ? { ...prev, activeClinic } : prev;
    });
    setScreen('dashboard');
    setScreenData(null);
  };

  // Keeps the sidebar/clinic list in sync after Settings adds, edits, or
  // switches a clinic.
  const handleClinicsChanged = (clinics: User['clinics'], activeClinicId?: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const activeClinic = activeClinicId
        ? clinics.find(c => c.id === activeClinicId) ?? prev.activeClinic
        : clinics.find(c => c.id === prev.activeClinic.id) ?? prev.activeClinic;
      return { ...prev, clinics, activeClinic };
    });
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setUser(null);
    setChoosingClinic(false);
    setScreen('dashboard');
    setScreenData(null);
  };

  // Whenever we are on the login screen (first load, logout, or expired
  // session), make sure no old login token is left behind.
  useEffect(() => {
    if (!loggedIn) clearToken();
  }, [loggedIn]);

  // The API layer fires this when the backend rejects our token (401),
  // e.g. the session expired - send the user back to the login screen.
  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener('doctify:unauthorized', onUnauthorized);
    return () => window.removeEventListener('doctify:unauthorized', onUnauthorized);
  }, []);

  if (!loggedIn || !user) {
    return <Login onLogin={handleLogin} />;
  }

  if (choosingClinic) {
    return (
      <ClinicSelect
        clinics={user.clinics}
        initialClinicId={user.activeClinic.id}
        onSelect={handleClinicChosen}
      />
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            onNavigate={navigate}
          />
        );

      case 'add-patient':
        return (
          <AddPatient user={user} onNavigate={navigate} />
        );

      case 'patient-search':
        return (
          <PatientSearch
            onNavigate={navigate}
          />
        );

      case 'patient-details':
        return (
          <PatientDetails
            patient={screenData as Patient | null}
            onNavigate={navigate}
          />
        );

      case 'print-preview':
        return (
          <PrintPreview
            user={user}
            patient={screenData as Patient | null}
            onNavigate={navigate}
          />
        );

      case 'families':
        return (
          <Families
            onNavigate={navigate}
          />
        );

      case 'family-details':
  return (
    <FamilyDetails
      familyId={screenData as string}
      onNavigate={navigate}
    />
  );

  case 'reports':
  return <Reports />;

  case 'settings':
  return (
    <Settings
      user={user}
      onClinicSwitched={handleClinicSwitched}
      onClinicsChanged={handleClinicsChanged}
    />
  );

      case 'certificate':
      case 'medical-certificates':
        return <CertificateScreen />;

      case 'cash-receipt':
        return <CashReceipt />;

      case 'reference-letter':
        return <ReferenceLetter />;

      default:
        return (
          <Dashboard
            user={user}
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#EFF6FB' }}
    >
      <Sidebar
        activeScreen={screen}
        onNavigate={navigate}
        user={user}
        onLogout={handleLogout}
        onClinicSwitched={handleClinicSwitched}
      />

      <main
        className="flex-1 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        {renderScreen()}
      </main>
    </div>
  );
}