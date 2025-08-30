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
    <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      {/* Hour selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-600 mb-1">Hour</label>
        <select
          aria-label="Hour"
          className="w-16 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          value={hour}
          onChange={handleHourChange}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div className="flex flex-col items-center justify-center">
        <div className="text-gray-400 text-2xl font-bold">:</div>
      </div>

      {/* Minute selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-600 mb-1">Minute</label>
        <select
          aria-label="Minute"
          className="w-16 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          value={minute}
          onChange={handleMinuteChange}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>{pad2(m)}</option>
          ))}
        </select>
      </div>

      {/* Period selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-600 mb-1">Period</label>
        <select
          aria-label="AM/PM"
          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          value={period}
          onChange={handlePeriodChange}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>

      {/* Display time */}
      <div className="flex flex-col items-center ml-2">
        <label className="text-xs font-medium text-gray-600 mb-1">Time</label>
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-md text-blue-900 text-sm font-semibold">
          {formatted}
        </div>
      </div>
    </div>
  );
};

export default TimePicker;

