import React, { useEffect, useMemo, useState } from 'react';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthMatrix(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Convert Sunday (0) to 6, Monday (1) to 0, etc. to make Monday the first day
  const leadingEmpty = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
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

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Count entries by type for a given date
  const getEntryCounts = (date) => {
    const dateKey = date.toDateString();
    const dateEntries = entries[dateKey] || [];
    
    return {
      meal: dateEntries.filter(e => e.type === 'meal').length,
      sleep: dateEntries.filter(e => e.type === 'sleep').length,
      measurements: dateEntries.filter(e => e.type === 'measurements').length,
      exercise: dateEntries.filter(e => e.type === 'exercise').length,
      total: dateEntries.length
    };
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
    <div className="p-3 sm:p-6 border border-gray-200 rounded-xl bg-white text-gray-900 shadow-lg shadow-gray-100/50 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button 
          onClick={goPrevMonth} 
          className="p-2 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center px-2">{monthLabel}</h2>
        <button 
          onClick={goNextMonth} 
          className="p-2 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 sm:py-2 px-1">{label}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthMatrix.map((week) =>
          week.map((cell) => {
            const isSelected = cell.key === selectedKey;
            const isTodayDate = isToday(cell.date);
            
            const baseClasses = 'py-2 sm:py-3 px-1 rounded-lg cursor-pointer select-none transition-all duration-200 relative touch-manipulation min-h-[32px] sm:min-h-[36px] flex items-center justify-center';
            let stateClasses = '';
            
            if (isSelected) {
              stateClasses = 'bg-blue-600 text-white shadow-lg shadow-blue-200';
            } else if (isTodayDate) {
              stateClasses = 'bg-blue-50 text-blue-700 border-2 border-blue-200';
            } else if (cell.inCurrentMonth) {
              stateClasses = 'text-gray-900 hover:bg-gray-50 hover:shadow-sm';
            } else {
              stateClasses = 'text-gray-400 hover:bg-gray-50';
            }

            const entryCounts = getEntryCounts(cell.date);
            const hasEntries = entryCounts.total > 0;

            return (
              <div
                key={cell.key}
                data-calendar-cell
                className={`${baseClasses} ${stateClasses} relative`}
                onClick={(e) => {
                  setSelectedKey(cell.key);
                  // If clicking an outside day, also update the visible month to match
                  if (!cell.inCurrentMonth) {
                    setViewYear(cell.date.getFullYear());
                    setViewMonth(cell.date.getMonth());
                  }
                  
                  // Navigate directly to the date
                  if (typeof onSelectDate === 'function') {
                    onSelectDate(cell.date);
                  }
                }}
                aria-selected={isSelected}
                role="gridcell"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // For keyboard, navigate directly
                    if (typeof onSelectDate === 'function') {
                      onSelectDate(cell.date);
                    }
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center min-h-[2.5rem] gap-1">
                  <span className={`font-medium ${isTodayDate && !isSelected ? 'text-blue-700' : ''}`}>
                    {cell.dayNumber}
                  </span>
                  {hasEntries && (
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isSelected 
                        ? 'bg-white' 
                        : isTodayDate 
                          ? 'bg-blue-600' 
                          : 'bg-blue-500'
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

