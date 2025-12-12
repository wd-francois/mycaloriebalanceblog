import { useEffect, useMemo, useState } from 'react';

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
    <div className="p-2 sm:p-3 md:p-6 text-gray-900 dark:text-white w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
        <button
          onClick={goPrevMonth}
          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          aria-label="Previous month"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white text-center px-1 sm:px-2">{monthLabel}</h2>
        <button
          onClick={goNextMonth}
          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          aria-label="Next month"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 md:mb-3">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-0.5 sm:py-1 md:py-2 px-0.5 sm:px-1">{label}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {monthMatrix.map((week) =>
          week.map((cell) => {
            const isSelected = cell.key === selectedKey;
            const isTodayDate = isToday(cell.date);

            const baseClasses = 'py-1.5 sm:py-2 md:py-3 px-0.5 sm:px-1 rounded-lg cursor-pointer select-none transition-all duration-200 relative touch-manipulation min-h-[28px] sm:min-h-[32px] md:min-h-[36px] flex items-center justify-center';
            let stateClasses = '';

            if (isSelected) {
              stateClasses = 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900';
            } else if (isTodayDate) {
              stateClasses = 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700';
            } else if (cell.inCurrentMonth) {
              stateClasses = 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm';
            } else {
              stateClasses = 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700';
            }

            const entryCounts = getEntryCounts(cell.date);
            const hasEntries = entryCounts.total > 0;

            return (
              <div
                key={cell.key}
                data-calendar-cell
                className={`${baseClasses} ${stateClasses} relative`}
                onClick={() => {
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
                <div className="flex flex-col items-center justify-center min-h-[1.75rem] sm:min-h-[2rem] md:min-h-[2.5rem] gap-0.5 sm:gap-1">
                  <span className={`text-sm sm:text-base font-medium ${isTodayDate && !isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                    {cell.dayNumber}
                  </span>
                  {hasEntries && (
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSelected
                      ? 'bg-white'
                      : isTodayDate
                        ? 'bg-blue-600 dark:bg-blue-400'
                        : 'bg-blue-500 dark:bg-blue-400'
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

