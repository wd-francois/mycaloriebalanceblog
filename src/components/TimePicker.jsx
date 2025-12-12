import { useMemo, useRef, useEffect, useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);   // 0..59

function pad2(n) {
  return n.toString().padStart(2, '0');
}

const TimePicker = ({
  value = { hour: 12, minute: 0, period: 'PM' },
  onChange,
}) => {
  const hour = value?.hour ?? 12;
  const minute = value?.minute ?? 0;
  const period = value?.period ?? 'PM';
  const selectRef = useRef(null);
  const timeDisplayRef = useRef(null);
  const [timeDisplayHeight, setTimeDisplayHeight] = useState('auto');

  const formatted = useMemo(() => `${hour}:${pad2(minute)} ${period}`, [hour, minute, period]);
  const displayTime = useMemo(() => `${hour}:${pad2(minute)} ${period}`, [hour, minute, period]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      if (selectRef.current) {
        const selectHeight = selectRef.current.offsetHeight;
        setTimeDisplayHeight(`${selectHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    // Use a small timeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(updateHeight, 0);

    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timeoutId);
    };
  }, [hour, minute, period]);

  function handleHourChange(e) {
    const value = Number(e.target.value);
    onChange?.({ hour: value, minute, period, formatted });
  }

  function handleMinuteChange(e) {
    const value = Number(e.target.value);
    onChange?.({ hour, minute: value, period, formatted });
  }

  function handlePeriodChange(e) {
    const value = e.target.value;
    onChange?.({ hour, minute, period: value, formatted });
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg">
      {/* Hour selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-600 mb-1 hidden sm:block">Hour</label>
        <select
          ref={selectRef}
          aria-label="Hour"
          className="w-16 sm:w-16 px-1 sm:px-3 py-1.5 sm:py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          value={hour}
          onChange={handleHourChange}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div className="flex items-center justify-center">
        <div className="text-gray-400 text-lg sm:text-2xl font-bold">:</div>
      </div>

      {/* Minute selector */}
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-600 mb-1 hidden sm:block">Minute</label>
        <select
          aria-label="Minute"
          className="w-16 sm:w-16 px-1 sm:px-3 py-1.5 sm:py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
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
        <label className="text-xs font-medium text-gray-600 mb-1 hidden sm:block">Period</label>
        <select
          aria-label="AM/PM"
          className="w-16 sm:w-20 px-1 sm:px-3 py-1.5 sm:py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
          value={period}
          onChange={handlePeriodChange}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>

      {/* Display time */}
      <div className="flex flex-col items-center ml-2">
        <label className="text-xs font-medium text-gray-600 mb-1 hidden sm:block">Time</label>
        <div
          ref={timeDisplayRef}
          className="w-16 sm:w-20 px-1 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-md text-gray-900 text-xs sm:text-sm font-medium text-center flex items-center justify-center sm:bg-blue-50 sm:border-blue-200 sm:text-blue-900 sm:font-semibold"
          style={{ height: timeDisplayHeight, boxSizing: 'border-box' }}
        >
          {displayTime}
        </div>
      </div>
    </div>
  );
};

export default TimePicker;

