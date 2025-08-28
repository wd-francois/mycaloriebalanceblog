import React, { useEffect, useMemo, useState } from 'react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthMatrix(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const leadingEmpty = startDayOfWeek;
  const totalCells = leadingEmpty + daysInMonth;
  const weeks = Math.ceil(totalCells / 7);

  const matrix = [];
  let currentDay = 1 - leadingEmpty;

  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, currentDay);
      const inCurrentMonth = currentDay >= 1 && currentDay <= daysInMonth;
      week.push({
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date,
        inCurrentMonth,
        dayNumber: date.getDate(),
      });
      currentDay++;
    }
    matrix.push(week);
  }

  return matrix;
}

const Calendar = ({ onSelectDate, selectedDate, entries = {} }) => {
  const initial = selectedDate instanceof Date ? selectedDate : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selectedKey, setSelectedKey] = useState(
    `${initial.getFullYear()}-${initial.getMonth()}-${initial.getDate()}`
  );

  useEffect(() => {
    if (selectedDate instanceof Date) {
      setSelectedKey(`${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`);
    }
  }, [selectedDate]);

  const monthMatrix = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  // Helper function to check if a date has entries
  const hasEntries = (date) => {
    const dateKey = date.toDateString();
    return entries[dateKey] && entries[dateKey].length > 0;
  };

  function goPrevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goNextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 border border-neutral-400 rounded-md bg-white text-black w-full max-w-md">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrevMonth} className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">{'<'}</button>
        <h2 className="text-xl font-semibold text-center">{monthLabel}</h2>
        <button onClick={goNextMonth} className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">{'>'}</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-600 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 font-medium">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {monthMatrix.map((week) =>
          week.map((cell) => {
            const isSelected = cell.key === selectedKey;
            const hasEntriesForDay = hasEntries(cell.date);
            const baseClasses = 'py-2 rounded cursor-pointer select-none';
            const stateClasses = [
              cell.inCurrentMonth ? 'text-gray-900' : 'text-gray-400',
              isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100',
            ].join(' ');
            return (
              <div
                key={cell.key}
                className={`${baseClasses} ${stateClasses}`}
                onClick={() => {
                  setSelectedKey(cell.key);
                  // If clicking an outside day, also update the visible month to match
                  if (!cell.inCurrentMonth) {
                    setViewYear(cell.date.getFullYear());
                    setViewMonth(cell.date.getMonth());
                  }
                  if (typeof onSelectDate === 'function') {
                    onSelectDate(cell.date);
                  }
                }}
                aria-selected={isSelected}
                role="gridcell"
              >
                <div className="flex flex-col items-center">
                  <span>{cell.dayNumber}</span>
                  {hasEntriesForDay && (
                    <div className={`w-2 h-2 rounded-full mt-1 ${
                      isSelected ? 'bg-white' : 'bg-blue-500'
                    }`}></div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Calendar;