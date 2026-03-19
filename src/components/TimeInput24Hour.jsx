import { useState, useEffect, useRef } from 'react';

/**
 * 24-hour time input (HH:MM) with increment/decrement buttons.
 * value: "HH:MM" string. onChange: called with event where e.target.value is "HH:MM".
 */
export function TimeInput24Hour({
  value = '',
  onChange,
  id,
  className = '',
  step = 60,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('00:00');
  const inputRef = useRef(null);

  useEffect(() => {
    if (value && typeof value === 'string') {
      const [h, m] = value.split(':');
      if (h != null && m != null) {
        const hour = Math.max(0, Math.min(23, parseInt(h, 10) || 0));
        const min = Math.max(0, Math.min(59, parseInt(m, 10) || 0));
        setDisplayValue(
          `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        );
      } else {
        setDisplayValue('00:00');
      }
    } else {
      setDisplayValue('00:00');
    }
  }, [value]);

  const formatTime = (hours, minutes) => {
    const h = String(Math.max(0, Math.min(23, hours))).padStart(2, '0');
    const m = String(Math.max(0, Math.min(59, minutes))).padStart(2, '0');
    return `${h}:${m}`;
  };

  const updateTime = (newTime) => {
    setDisplayValue(newTime);
    if (onChange) {
      onChange({ target: { value: newTime } });
    }
  };

  const adjustTime = (deltaMinutes) => {
    const [hours, minutes] = displayValue
      .split(':')
      .map((v) => parseInt(v, 10) || 0);
    let totalMinutes = hours * 60 + minutes + deltaMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    if (totalMinutes >= 24 * 60) totalMinutes %= 24 * 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    updateTime(formatTime(newHours, newMinutes));
  };

  const handleBlur = () => {
    const [h, m] = displayValue.split(':').map((v) => parseInt(v, 10) || 0);
    updateTime(formatTime(h, m));
  };

  const handleChange = (e) => {
    const input = e.target.value.replace(/[^\d:]/g, '');
    if (input === '') {
      setDisplayValue('');
      return;
    }
    const parts = input.split(':');
    if (parts.length === 2) {
      const h = Math.min(23, parseInt(parts[0], 10) || 0);
      const m = Math.min(59, parseInt(parts[1], 10) || 0);
      const newTime = formatTime(h, m);
      setDisplayValue(newTime);
      if (onChange) onChange({ target: { value: newTime } });
      return;
    }
    const digits = input.replace(/\D/g, '');
    if (digits.length === 0) {
      updateTime('00:00');
      return;
    }
    if (digits.length <= 2) {
      const h = Math.min(23, parseInt(digits, 10) || 0);
      setDisplayValue(formatTime(h, 0));
      if (onChange) onChange({ target: { value: formatTime(h, 0) } });
    } else {
      const h = Math.min(23, parseInt(digits.slice(0, 2), 10) || 0);
      const m = Math.min(59, parseInt(digits.slice(2, 4), 10) || 0);
      const newTime = formatTime(h, m);
      setDisplayValue(newTime);
      if (onChange) onChange({ target: { value: newTime } });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      adjustTime(step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      adjustTime(-step);
    }
  };

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      id={id}
    >
      <button
        type="button"
        onClick={() => adjustTime(-step)}
        className="flex items-center justify-center w-8 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-orange-500 transition-colors"
        aria-label="Decrease time"
        tabIndex={-1}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="relative flex items-center border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-[var(--color-bg-subtle)] focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={5}
          className="w-20 text-center bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-semibold text-lg"
          aria-label="Time (24-hour, HH:MM)"
          placeholder="00:00"
          {...props}
        />
      </div>
      <button
        type="button"
        onClick={() => adjustTime(step)}
        className="flex items-center justify-center w-8 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:ring-2 focus:ring-orange-500 transition-colors"
        aria-label="Increase time"
        tabIndex={-1}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
