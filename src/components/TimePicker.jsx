import React, { useMemo, useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);   // 0..59

function pad2(n) {
  return n.toString().padStart(2, '0');
}

const TimePicker = ({
  initialHour = 12,
  initialMinute = 0,
  initialPeriod = 'PM',
  onChange,
}) => {
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [period, setPeriod] = useState(initialPeriod);

  const formatted = useMemo(() => `${hour}:${pad2(minute)} ${period}`, [hour, minute, period]);

  function handleHourChange(e) {
    const value = Number(e.target.value);
    setHour(value);
    onChange?.({ hour: value, minute, period, formatted });
  }

  function handleMinuteChange(e) {
    const value = Number(e.target.value);
    setMinute(value);
    onChange?.({ hour, minute: value, period, formatted });
  }

  function handlePeriodChange(e) {
    const value = e.target.value;
    setPeriod(value);
    onChange?.({ hour, minute, period: value, formatted });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Hour"
        className="border border-gray-300 dark:border-gray-700 rounded px-2 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        value={hour}
        onChange={handleHourChange}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span className="text-gray-900 dark:text-white">:</span>

      <select
        aria-label="Minute"
        className="border border-gray-300 dark:border-gray-700 rounded px-2 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        value={minute}
        onChange={handleMinuteChange}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{pad2(m)}</option>
        ))}
      </select>

      <select
        aria-label="AM/PM"
        className="border border-gray-300 dark:border-gray-700 rounded px-2 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        value={period}
        onChange={handlePeriodChange}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default TimePicker;

