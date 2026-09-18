
import type { ReactNode, ChangeEvent, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useState,useRef } from 'react';
// ——— Buttons ———
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  icon?: ReactNode;
}

const BUTTON_STYLES = {
  primary: { background: 'var(--color-primary)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--color-card)', color: 'var(--color-text)', border: '2px solid var(--color-border)' },
  danger: { background: 'var(--color-card)', color: 'var(--color-danger)', border: '2px solid var(--color-danger)' },
  success: { background: 'var(--color-success)', color: '#fff', border: 'none' },
  ghost: { background: 'transparent', color: 'var(--color-text-secondary)', border: 'none' },
};

const SIZE_STYLES = {
  sm: { fontSize: 13, padding: '6px 13px', gap: 5, height: 34 },
  md: { fontSize: 14, padding: '8px 17px', gap: 6, height: 40 },
  lg: { fontSize: 15, padding: '10px 21px', gap: 7, height: 46 },
};

export function Button({ variant = 'primary', size = 'md', children, onClick, disabled, type = 'button', className = '', icon }: ButtonProps) {
  const vs = BUTTON_STYLES[variant];
  const ss = SIZE_STYLES[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all ${className}`}
      style={{
        ...vs,
        fontSize: ss.fontSize,
        padding: ss.padding,
        gap: ss.gap,
        height: ss.height,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          if (variant === 'primary') el.style.background = 'var(--color-primary-dark)';
          else if (variant === 'secondary') el.style.background = 'var(--color-surface-hover)';
          else if (variant === 'success') el.style.background = 'var(--color-success-dark)';
          else if (variant === 'ghost') el.style.background = 'var(--color-surface-hover)';
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = vs.background;
        }
      }}
    >
      {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
      {children}
    </button>
  );
}

// ——— Input ———
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  showMic?: boolean;
  voiceLanguage?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  icon,
  trailingIcon,
  showMic = false,
  voiceLanguage = 'mr-IN',
  error,
  hint,
  className = '',
  ...props
}: InputProps) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    setVoiceError('');

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;

      const currentValue =
        typeof props.value === 'string' ? props.value : '';

      const nextValue = currentValue
        ? `${currentValue} ${transcript}`
        : transcript;

      if (props.onChange) {
        props.onChange({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as ChangeEvent<HTMLInputElement>);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError('Microphone permission was blocked. Allow microphone access in the browser.');
      } else if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Please try again.');
      } else {
        setVoiceError(`Voice input error: ${event.error}`);
      }

      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('Could not start speech recognition:', error);
      setListening(false);
      setVoiceError('Could not start voice input. Please try again.');
    }
  };

  const hasTrailingSpace = Boolean(trailingIcon || showMic);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <span
            className="absolute left-3 flex items-center"
            style={{ color: 'var(--color-text-muted)', pointerEvents: 'none' }}
          >
            {icon}
          </span>
        )}

        <input
          {...props}
          className="w-full rounded-lg text-sm outline-none transition-all"
          style={{
            border: `2px solid ${error ? 'var(--color-danger)' : listening ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: 'var(--color-card)',
            color: 'var(--color-text)',
            padding: icon ? '8px 36px 8px 36px' : '8px 12px',
            paddingLeft: icon ? 36 : 12,
            paddingRight: hasTrailingSpace ? 36 : 12,
            height: 36,
            fontSize: 14,
          }}
          onFocus={e => {
            (e.target as HTMLInputElement).style.borderColor = 'var(--color-primary)';
            (e.target as HTMLInputElement).style.boxShadow =
              '0 0 0 4px var(--color-focus-ring)';
          }}
          onBlur={e => {
            (e.target as HTMLInputElement).style.borderColor =
              error ? 'var(--color-danger)' : listening ? 'var(--color-primary)' : 'var(--color-border)';
            (e.target as HTMLInputElement).style.boxShadow = 'none';
          }}
        />

        {trailingIcon && !showMic && (
          <span
            className="absolute right-3 flex items-center"
            style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            {trailingIcon}
          </span>
        )}

        {showMic && (
          <button
            type="button"
            className="absolute right-2.5 rounded-md p-1 transition-colors"
            style={{
              color: listening ? '#2196C9' : '#9AAFBF',
              background: listening ? 'var(--color-primary-light)' : 'transparent',
            }}
            title={listening ? 'Stop voice input' : 'Voice input'}
            aria-label={listening ? 'Stop voice input' : 'Voice input'}
            onClick={startVoiceInput}
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
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>
        )}
      </div>

      {voiceError && (
        <span className="text-[11px]" style={{ color: 'var(--color-danger)' }}>
          {voiceError}
        </span>
      )}

      {error && (
        <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
      {hint && !error && !voiceError && (
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ——— Textarea with mic ———
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  showMic?: boolean;
  voiceLanguage?: string; 
}

export function Textarea({
  label,
  showMic = true,
  voiceLanguage = 'mr-IN',   // ADD THIS LINE
  className = '',
  style: _style,
  ...props
}: TextareaProps) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    setVoiceError('');

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();

      if (!transcript) return;

      const currentValue =
        typeof props.value === 'string' ? props.value : '';

      const nextValue = currentValue
        ? `${currentValue} ${transcript}`
        : transcript;

      if (props.onChange) {
        props.onChange({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as ChangeEvent<HTMLTextAreaElement>);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError('Microphone permission was blocked. Allow microphone access in the browser.');
      } else if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Please try again.');
      } else {
        setVoiceError(`Voice input error: ${event.error}`);
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error('Could not start speech recognition:', error);
      setListening(false);
      setVoiceError('Could not start voice input. Please try again.');
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
      )}

      <div className="relative">
        <textarea
          {...props}
          className="w-full rounded-lg text-sm outline-none transition-all resize-none"
          style={{
            border: `2px solid ${listening ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: 'var(--color-card)',
            color: 'var(--color-text)',
            padding: '8px 36px 8px 12px',
            fontSize: 13,
            lineHeight: 1.5,
            ..._style,
          }}
          onFocus={e => {
            (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-primary)';
            (e.target as HTMLTextAreaElement).style.boxShadow =
              '0 0 0 4px var(--color-focus-ring)';
          }}
          onBlur={e => {
            (e.target as HTMLTextAreaElement).style.borderColor =
              listening ? '#2196C9' : '#D4E5F0';
            (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
          }}
        />

        {showMic && (
          <button
            type="button"
            className="absolute right-2.5 top-2 rounded-md p-1 transition-colors"
            style={{
              color: listening ? '#2196C9' : '#9AAFBF',
              background: listening ? 'var(--color-primary-light)' : 'transparent',
            }}
            title={listening ? 'Stop voice input' : 'Voice input'}
            aria-label={listening ? 'Stop voice input' : 'Voice input'}
            onClick={startVoiceInput}
            onMouseEnter={e => {
              if (!listening) {
                (e.currentTarget as HTMLButtonElement).style.color = '#2196C9';
              }
            }}
            onMouseLeave={e => {
              if (!listening) {
                (e.currentTarget as HTMLButtonElement).style.color = '#9AAFBF';
              }
            }}
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
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>
        )}
      </div>

      {voiceError && (
        <span className="text-[11px]" style={{ color: 'var(--color-danger)' }}>
          {voiceError}
        </span>
      )}
    </div>
  );
}

// ——— Select ———
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>}
      <select
        {...props}
        className="w-full rounded-lg text-sm outline-none transition-all appearance-none"
        style={{
          border: '2px solid var(--color-border)',
          background: 'var(--color-card) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239AAFBF\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 10px center',
          color: 'var(--color-text)',
          padding: '0 30px 0 12px',
          height: 36,
          fontSize: 13,
        }}
        onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = 'var(--color-primary)'; (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 4px var(--color-focus-ring)'; }}
        onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = 'var(--color-border)'; (e.target as HTMLSelectElement).style.boxShadow = 'none'; }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ——— Card ———
export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', ...style }}
    >
      {children}
    </div>
  );
}

// ——— Section header ———
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
      {action}
    </div>
  );
}

// ——— Status badge ———
type BadgeVariant = 'blue' | 'green' | 'gray' | 'red' | 'yellow';

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  blue: { bg: '#E8F4FA', color: '#1778A8' },
  green: { bg: '#E6F5EE', color: '#1FA563' },
  gray: { bg: '#F0F4F8', color: '#5A7080' },
  red: { bg: '#FDEEEE', color: '#DC3545' },
  yellow: { bg: '#FEF3E2', color: '#B45309' },
};

export function Badge({ variant = 'gray', children }: { variant?: BadgeVariant; children: ReactNode }) {
  const s = BADGE_STYLES[variant];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}

// ——— Stat card ———
export function StatCard({
  label, value, sub, color = '#2196C9', icon, action,
}: {
  label: string; value: string | number; sub?: string; color?: string; icon: ReactNode; action?: { label: string; onClick: () => void };
}) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
          {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{sub}</div>}
        </div>
        <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-medium mt-1 text-left transition-colors"
          style={{ color: '#2196C9' }}
        >
          {action.label} →
        </button>
      )}
    </Card>
  );
}

// ——— Page header ———
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-shrink-0">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ——— Divider ———
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr style={{ border: 'none', borderTop: '1px solid #E5EEF4', margin: '4px 0' }} />;
  return (
    <div className="flex items-center gap-3" style={{ margin: '4px 0' }}>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E5EEF4' }} />
      <span className="text-xs font-semibold px-1" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E5EEF4' }} />
    </div>
  );
}

// ——— Empty state ———
export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div style={{ color: '#D4E5F0', transform: 'scale(2)' }}>{icon}</div>
      <div className="text-sm font-medium mt-4" style={{ color: 'var(--color-text-muted)' }}>{title}</div>
      {subtitle && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>}
    </div>
  );
}