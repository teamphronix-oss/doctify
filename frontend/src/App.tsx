import { useState } from 'react';
import type { Screen, User, Patient, Clinic } from './types';
import { DEFAULT_USER } from './data';

import Sidebar from './components/Sidebar';
import Reports from './screens/Reports';

import Login from './screens/Login';
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
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [screenData, setScreenData] = useState<unknown>(null);

  const navigate = (s: Screen, data?: unknown) => {
    setScreen(s);
    setScreenData(data ?? null);
  };

  const handleLogin = (clinic: Clinic) => {
    setUser({
      ...DEFAULT_USER,
      activeClinic: clinic,
    });

    setLoggedIn(true);
    setScreen('dashboard');
    setScreenData(null);
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setScreen('dashboard');
    setScreenData(null);
  };

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
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
  return <Settings />;

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