import { useEffect, useMemo, useRef, useState } from 'react';

interface EditableDropdownProps<T> {
  label: string;
  value: string;
  items: T[];
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  onAdd?: (value: string) => Promise<void> | void;
  onDelete?: (item: T) => Promise<void> | void;
  placeholder?: string;
  emptyText?: string;
  addText?: string;
  showMic?: boolean;
  voiceLanguage?: string;
}

export function EditableDropdown<T>({
  label,
  value,
  items,
  getKey,
  getLabel,
  onChange,
  onSelect,
  onAdd,
  onDelete,
  placeholder,
  emptyText = 'No items found',
  addText = 'Add new',
  showMic = false,
  voiceLanguage = 'mr-IN',
}: EditableDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busyKey, setBusyKey] = useState<string | number | null>(null);
  const [voiceError, setVoiceError] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const filteredItems = useMemo(() => {
    const search = value.trim().toLowerCase();

    if (!search) return items;

    return items.filter(item =>
      getLabel(item).toLowerCase().includes(search)
    );
  }, [items, value, getLabel]);

  const exactMatch = useMemo(() => {
    const search = value.trim().toLowerCase();

    if (!search) return false;

    return items.some(
      item => getLabel(item).trim().toLowerCase() === search
    );
  }, [items, value, getLabel]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }

    setVoiceError('');

    const recognition = new SpeechRecognition();

    // Uses the language selected by the parent.
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim() || '';

      if (transcript) {
        onChange(
          value.trim()
            ? `${value.trim()} ${transcript}`
            : transcript
        );
      }

      setOpen(true);
    };

    recognition.onerror = (event: any) => {
      setListening(false);

      console.error('Speech recognition error:', event.error);

      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        setVoiceError(
          'Microphone permission was blocked. Allow microphone access in the browser.'
        );
      } else if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Please try again.');
      } else {
        setVoiceError(`Voice input error: ${event.error}`);
      }
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

  const handleSelect = (item: T) => {
    onSelect(item);
    setOpen(false);
    setVoiceError('');
  };

  const handleAdd = async () => {
    const trimmed = value.trim();

    if (!onAdd || !trimmed || exactMatch) return;

    const confirmed = window.confirm(
      `Add "${trimmed}" to the ${label.toLowerCase()} list?`
    );

    if (!confirmed) return;

    setBusyKey('__add__');

    try {
      await onAdd(trimmed);
      setOpen(false);
    } catch (error) {
      console.error('Add failed:', error);
      window.alert('Could not add this item. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (item: T) => {
    if (!onDelete) return;

    const itemLabel = getLabel(item);

    const confirmed = window.confirm(
      `Delete "${itemLabel}" from the ${label.toLowerCase()} list?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    const key = getKey(item);
    setBusyKey(key);

    try {
      await onDelete(item);
    } catch (error) {
      console.error('Delete failed:', error);
      window.alert('Could not delete this item. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <label
          className="text-xs font-semibold"
          style={{ color: '#526D80' }}
        >
          {label}
        </label>

        {items.length > 0 && (
          <span
            className="text-[10px]"
            style={{ color: '#9AAEBC' }}
          >
            {items.length} available
          </span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={event => {
            onChange(event.target.value);
            setOpen(true);
            setVoiceError('');
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl text-sm outline-none transition-all"
          style={{
            height: 42,
            paddingLeft: 40,
            paddingRight: showMic ? 78 : 40,
            border: `1.5px solid ${
              listening
                ? '#2196C9'
                : open
                  ? '#9CCDE5'
                  : '#D4E5F0'
            }`,
            background: open ? '#FFFFFF' : '#FBFDFF',
            color: '#1A2B3C',
            boxShadow: open
              ? '0 0 0 3px rgba(33, 150, 201, 0.08)'
              : 'none',
          }}
        />

        {/* Search icon */}
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: '#91A9B9' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </span>

        {/* Microphone */}
        {showMic && (
          <button
            type="button"
            onClick={startVoiceInput}
            className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg transition-all"
            style={{
              width: 30,
              height: 30,
              color: listening ? '#2196C9' : '#8FA8B8',
              background: listening ? '#E7F5FB' : 'transparent',
            }}
            title={
              listening
                ? 'Stop voice input'
                : `Voice input (${voiceLanguage})`
            }
            aria-label={
              listening ? 'Stop voice input' : 'Voice input'
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="13" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v4" />
              <path d="M8 22h8" />
            </svg>

            {listening && (
              <span
                className="absolute inset-0 rounded-lg animate-pulse"
                style={{
                  border: '1px solid #79C2E1',
                }}
              />
            )}
          </button>
        )}

        {/* Dropdown arrow */}
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg"
          style={{
            width: 28,
            height: 28,
            color: open ? '#2196C9' : '#8FA8B8',
          }}
          aria-label={`Open ${label}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Voice error */}
      {voiceError && (
        <div
          className="mt-1.5 text-[11px] leading-4"
          style={{ color: '#D9534F' }}
        >
          {voiceError}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-[100] left-0 right-0 mt-2 overflow-hidden rounded-xl"
          style={{
            background: '#FFFFFF',
            border: '1px solid #D5E6F0',
            boxShadow:
              '0 12px 35px rgba(30, 62, 82, 0.14)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: '#F7FBFD',
              borderBottom: '1px solid #E7F0F5',
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: '#89A1B1' }}
            >
              {label}
            </span>

            <span
              className="text-[10px]"
              style={{ color: '#A3B5C0' }}
            >
              {filteredItems.length} result
              {filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Results */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 235 }}
          >
            {filteredItems.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <div
                  className="mx-auto mb-2 flex items-center justify-center rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    background: '#F2F7FA',
                    color: '#9AAEBC',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>

                <div
                  className="text-xs font-medium"
                  style={{ color: '#6F8796' }}
                >
                  {emptyText}
                </div>

                <div
                  className="mt-1 text-[10px]"
                  style={{ color: '#A4B5BF' }}
                >
                  You can add the typed value below.
                </div>
              </div>
            ) : (
              filteredItems.map(item => {
                const key = getKey(item);
                const itemLabel = getLabel(item);
                const selected =
                  itemLabel.trim().toLowerCase() ===
                  value.trim().toLowerCase();
                const busy = busyKey === key;

                return (
                  <div
                    key={key}
                    className="group flex items-center gap-2 px-2 py-1.5"
                    style={{
                      borderBottom: '1px solid #F0F5F8',
                      background: selected
                        ? '#F4FAFD'
                        : '#FFFFFF',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex-1 min-w-0 flex items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors"
                      onMouseEnter={event => {
                        event.currentTarget.style.background =
                          '#F5FAFD';
                      }}
                      onMouseLeave={event => {
                        event.currentTarget.style.background =
                          'transparent';
                      }}
                    >
                      <span
                        className="flex-shrink-0 flex items-center justify-center rounded-md"
                        style={{
                          width: 25,
                          height: 25,
                          background: selected
                            ? '#E4F3FA'
                            : '#F4F8FA',
                          color: selected
                            ? '#2196C9'
                            : '#9AAEBC',
                        }}
                      >
                        {selected ? (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        ) : (
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: 'currentColor',
                            }}
                          />
                        )}
                      </span>

                      <span
                        className="block truncate text-sm"
                        style={{
                          color: '#243B4B',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {itemLabel}
                      </span>
                    </button>

                    {/* Delete appears visually subtle and stronger on hover */}
                    {onDelete && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(item)}
                        className="flex-shrink-0 flex items-center justify-center rounded-lg opacity-40 group-hover:opacity-100 transition-all"
                        style={{
                          width: 30,
                          height: 30,
                          color: '#D45B5B',
                          background: 'transparent',
                        }}
                        title={`Delete ${itemLabel}`}
                        onMouseEnter={event => {
                          event.currentTarget.style.background =
                            '#FFF1F1';
                          event.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={event => {
                          event.currentTarget.style.background =
                            'transparent';
                          event.currentTarget.style.opacity = '0.4';
                        }}
                      >
                        {busy ? (
                          <span className="text-xs">…</span>
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 15H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add new */}
          {onAdd && value.trim() && !exactMatch && (
            <button
              type="button"
              disabled={busyKey === '__add__'}
              onClick={handleAdd}
              className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
              style={{
                color: '#1687B8',
                background: '#F4FAFD',
                borderTop: '1px solid #DDECF3',
              }}
              onMouseEnter={event => {
                event.currentTarget.style.background = '#EAF6FB';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.background = '#F4FAFD';
              }}
            >
              <span
                className="flex items-center justify-center rounded-lg"
                style={{
                  width: 30,
                  height: 30,
                  background: '#DDF1F9',
                  color: '#1687B8',
                }}
              >
                {busyKey === '__add__' ? (
                  '…'
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                )}
              </span>

              <span className="min-w-0">
                <span
                  className="block text-xs font-semibold"
                  style={{ color: '#1687B8' }}
                >
                  {busyKey === '__add__'
                    ? 'Adding…'
                    : `Add new ${label.replace(' *', '').toLowerCase()}`}
                </span>

                <span
                  className="block truncate text-[11px] mt-0.5"
                  style={{ color: '#7893A2' }}
                >
                  “{value.trim()}”
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
