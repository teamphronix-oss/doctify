import type { Screen, User } from '../types';
import type { ReactElement } from 'react';
import type { CSSProperties } from 'react';
import { BarChart3,Settings } from 'lucide-react';

interface NavItem {
  id: Screen;
  label: string;
  icon: ReactElement;
}

const Icon = ({
  path,
  size = 18,
}: {
  path: string;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <Icon path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />
    ),
  },
  {
    id: 'add-patient',
    label: 'Add Patient / Rx',
    icon: <Icon path="M12 5v14M5 12h14" />,
  },
  {
    id: 'patient-search',
    label: 'Patient Search',
    icon: (
      <Icon path="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
    ),
  },
  {
    id: 'families',
    label: 'Families',
    icon: (
      <Icon path="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
  },
  {
    id: 'certificate',
    label: 'Medical Certificates',
    icon: (
      <Icon path="M9 12l2 2 4-4M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
    ),
  },
  {
    id: 'cash-receipt',
    label: 'Cash Receipts',
    icon: (
      <Icon path="M9 14l6-6M9.5 9a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm5 5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12z" />
    ),
  },
  {
    id: 'reference-letter',
    label: 'Reference Letter',
    icon: (
      <Icon path="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
    ),
  },
   {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart3 size={19} strokeWidth={1.9} />,
  },
   {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={19} />,
  },
];

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({
  activeScreen,
  onNavigate,
  user,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className="phronix-sidebar"
      style={{
        '--sidebar-width': '248px',
      } as CSSProperties}
    >
      <style>{`
        .phronix-sidebar {
          width: var(--sidebar-width);
          flex: 0 0 var(--sidebar-width);
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          color: #fff;
          background:
            radial-gradient(circle at 10% 0%, rgba(34,193,238,.18), transparent 28%),
            radial-gradient(circle at 100% 72%, rgba(124,58,237,.14), transparent 34%),
            linear-gradient(180deg, #08111f 0%, #0c1b2e 48%, #07101c 100%);
          border-right: 1px solid rgba(255,255,255,.07);
          box-shadow: 14px 0 40px rgba(3,10,20,.18);
          isolation: isolate;
        }

        .phronix-sidebar::before {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          left: -150px;
          top: 120px;
          border-radius: 50%;
          background: rgba(34,193,238,.07);
          filter: blur(55px);
          pointer-events: none;
          z-index: -1;
        }

        .phronix-sidebar-header {
          padding: 20px 16px 16px;
          border-bottom: 1px solid rgba(255,255,255,.075);
        }

        .phronix-product {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 3px 5px 16px;
        }

        .phronix-product-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 38px;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .04em;
          background: linear-gradient(145deg, #25c8ee 0%, #2377e8 55%, #6242d9 100%);
          box-shadow:
            0 7px 18px rgba(34,193,238,.22),
            inset 0 1px 0 rgba(255,255,255,.25);
        }

        .phronix-product-name {
          min-width: 0;
        }

        .phronix-product-title {
          margin: 0;
          color: #f8fbff;
          font-size: 14px;
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -.01em;
        }

        .phronix-product-subtitle {
          margin-top: 4px;
          color: rgba(255,255,255,.42);
          font-size: 10px;
          line-height: 1;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .phronix-clinic-card {
          position: relative;
          overflow: hidden;
          width: 100%;
          padding: 12px 12px 11px;
          border: 1px solid rgba(255,255,255,.085);
          border-radius: 13px;
          background:
            linear-gradient(135deg, rgba(34,193,238,.115), rgba(124,58,237,.055)),
            rgba(255,255,255,.035);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.045);
        }

        .phronix-clinic-card::after {
          content: "";
          position: absolute;
          width: 110px;
          height: 110px;
          right: -55px;
          top: -60px;
          border-radius: 50%;
          background: rgba(34,193,238,.08);
          filter: blur(12px);
          pointer-events: none;
        }

        .phronix-clinic-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          color: rgba(255,255,255,.4);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .phronix-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #39d98a;
          box-shadow: 0 0 10px rgba(57,217,138,.65);
        }

        .phronix-clinic-name {
          color: #f4f8fc;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .phronix-clinic-role {
          margin-top: 4px;
          color: rgba(255,255,255,.42);
          font-size: 10px;
        }

        .phronix-nav {
          min-height: 0;
          flex: 1;
          overflow-y: auto;
          padding: 16px 11px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,.14) transparent;
        }

        .phronix-nav::-webkit-scrollbar {
          width: 5px;
        }

        .phronix-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .phronix-nav::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255,255,255,.12);
        }

        .phronix-nav-label {
          padding: 0 10px 8px;
          color: rgba(255,255,255,.27);
          font-size: 9px;
          font-weight: 750;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .phronix-nav-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .phronix-nav-item {
          position: relative;
          width: 100%;
          min-height: 43px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: rgba(255,255,255,.58);
          text-align: left;
          font-size: 12px;
          font-weight: 560;
          cursor: pointer;
          transition:
            transform .22s cubic-bezier(.2,.8,.2,1),
            color .22s ease,
            background .22s ease,
            border-color .22s ease,
            box-shadow .22s ease;
        }

        .phronix-nav-item:hover {
          transform: translateX(3px);
          color: rgba(255,255,255,.92);
          background: rgba(255,255,255,.055);
          border-color: rgba(255,255,255,.055);
        }

        .phronix-nav-item:focus-visible {
          outline: 2px solid rgba(34,193,238,.7);
          outline-offset: 2px;
        }

        .phronix-nav-item.active {
          color: #fff;
          background:
            linear-gradient(100deg, rgba(34,193,238,.24), rgba(37,99,235,.18) 58%, rgba(124,58,237,.12));
          border-color: rgba(94,210,244,.16);
          box-shadow:
            0 8px 22px rgba(1,13,28,.18),
            inset 0 1px 0 rgba(255,255,255,.07);
        }

        .phronix-nav-item.active::before {
          content: "";
          position: absolute;
          left: -1px;
          top: 9px;
          bottom: 9px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, #35d6f3, #4c7cff);
          box-shadow: 0 0 12px rgba(34,193,238,.55);
        }

        .phronix-nav-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 30px;
          border-radius: 9px;
          color: currentColor;
          background: rgba(255,255,255,.035);
          transition: background .22s ease, transform .22s ease;
        }

        .phronix-nav-item:hover .phronix-nav-icon {
          transform: scale(1.04);
          background: rgba(255,255,255,.06);
        }

        .phronix-nav-item.active .phronix-nav-icon {
          background: rgba(34,193,238,.12);
          color: #62dcf4;
        }

        .phronix-nav-text {
          min-width: 0;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .phronix-footer {
          flex: 0 0 auto;
          padding: 12px 14px 14px;
          border-top: 1px solid rgba(255,255,255,.075);
          background: linear-gradient(180deg, rgba(255,255,255,.018), rgba(255,255,255,.035));
        }

        .phronix-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.055);
        }

        .phronix-avatar {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border-radius: 10px;
          color: #eafaff;
          font-size: 10px;
          font-weight: 750;
          background: linear-gradient(145deg, rgba(34,193,238,.38), rgba(99,72,217,.32));
          border: 1px solid rgba(255,255,255,.08);
        }

        .phronix-user-info {
          min-width: 0;
          flex: 1;
        }

        .phronix-user-name {
          color: rgba(255,255,255,.9);
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .phronix-user-reg {
          margin-top: 3px;
          color: rgba(255,255,255,.36);
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .phronix-logout {
          width: 100%;
          margin-top: 7px;
          min-height: 35px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          border: 1px solid transparent;
          border-radius: 9px;
          color: rgba(255,255,255,.42);
          background: transparent;
          font-size: 10px;
          cursor: pointer;
          transition: color .2s ease, background .2s ease, border-color .2s ease;
        }

        .phronix-logout:hover {
          color: rgba(255,255,255,.82);
          background: rgba(255,255,255,.055);
          border-color: rgba(255,255,255,.055);
        }

        .phronix-logout:focus-visible {
          outline: 2px solid rgba(34,193,238,.7);
          outline-offset: 2px;
        }

        .phronix-made-by {
          margin-top: 10px;
          padding-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-top: 1px solid rgba(255,255,255,.065);
          user-select: none;
        }

        .phronix-made-logo {
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          object-fit: cover;
          border-radius: 6px;
          box-shadow: 0 2px 7px rgba(0,0,0,.25);
        }

        .phronix-made-text {
          color: rgba(255,255,255,.4);
          font-size: 10px;
          line-height: 1.2;
        }

        .phronix-made-text strong {
          color: rgba(255,255,255,.72);
          font-weight: 750;
        }

        @media (max-height: 720px) {
          .phronix-sidebar-header {
            padding-top: 13px;
            padding-bottom: 12px;
          }

          .phronix-product {
            padding-bottom: 10px;
          }

          .phronix-nav {
            padding-top: 11px;
            padding-bottom: 10px;
          }

          .phronix-nav-item {
            min-height: 38px;
          }

          .phronix-nav-icon {
            width: 27px;
            height: 27px;
            flex-basis: 27px;
          }

          .phronix-footer {
            padding-top: 9px;
            padding-bottom: 9px;
          }
        }
      `}</style>

      <div className="phronix-sidebar-header">
        <div className="phronix-product">
          <div className="phronix-product-mark">OPD</div>

          <div className="phronix-product-name">
            <div className="phronix-product-title">Patient Records</div>
            <div className="phronix-product-subtitle">Doctify OPD</div>
          </div>
        </div>

        <div className="phronix-clinic-card">
          <div className="phronix-clinic-label">
            <span className="phronix-status-dot" />
            Active clinic
          </div>

          <div className="phronix-clinic-name">
            {user.activeClinic.name}
          </div>

          <div className="phronix-clinic-role">
            {user.role}
          </div>
        </div>
      </div>

      <nav className="phronix-nav" aria-label="Main navigation">
        <div className="phronix-nav-label">Workspace</div>

        <div className="phronix-nav-list">
          {NAV_ITEMS.map(item => {
            const isActive =
              activeScreen === item.id ||
              (item.id === 'patient-search' &&
                activeScreen === 'patient-details') ||
              (item.id === 'families' &&
                activeScreen === 'family-details') ||
              (item.id === 'add-patient' &&
                activeScreen === 'print-preview');

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`phronix-nav-item${isActive ? ' active' : ''}`}
              >
                <span className="phronix-nav-icon">
                  {item.icon}
                </span>
                <span className="phronix-nav-text">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="phronix-footer">
        <div className="phronix-user">
          <div className="phronix-avatar">
            {user.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)}
          </div>

          <div className="phronix-user-info">
            <div className="phronix-user-name">{user.name}</div>
            <div className="phronix-user-reg">{user.activeClinic.regNo}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="phronix-logout"
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
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span>Sign out</span>
        </button>

        <div className="phronix-made-by" aria-label="Made by Phronix">
          <img
            src="/branding/phronix-mark.png"
            alt=""
            draggable={false}
            className="phronix-made-logo"
          />
          <span className="phronix-made-text">
            Made by <strong>Phronix</strong>
          </span>
        </div>
      </div>
    </aside>
  );
}
