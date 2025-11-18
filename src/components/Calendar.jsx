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
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, above: true });
  const [touchTimeout, setTouchTimeout] = useState(null);
  // Initialize as true to be safe (assume touch device until proven otherwise)
  // This prevents tooltips from showing during initial render on mobile
  const [isTouchDevice, setIsTouchDevice] = useState(
    typeof window !== 'undefined' ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false
  );

  useEffect(() => {
    if (selectedDate instanceof Date) {
      setSelectedKey(`${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`);
    }
  }, [selectedDate]);

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  // Hide tooltip when clicking outside (for desktop only, since tooltips are disabled on mobile)
  useEffect(() => {
    // Don't set up any listeners on touch devices
    if (isTouchDevice) {
      // Clear any existing tooltip state on touch devices
      if (hoveredDate) {
        setHoveredDate(null);
      }
      if (touchTimeout) {
        clearTimeout(touchTimeout);
        setTouchTimeout(null);
      }
      return;
    }
    
    const handleClickOutside = (e) => {
      if (hoveredDate && !e.target.closest('[role="gridcell"]')) {
        setHoveredDate(null);
        if (touchTimeout) {
          clearTimeout(touchTimeout);
          setTouchTimeout(null);
        }
      }
    };
    
    if (hoveredDate) {
      // Add a small delay to avoid hiding immediately on the same click
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [hoveredDate, touchTimeout, isTouchDevice]);

  const monthMatrix = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  // Helper function to check if a date has entries
  const hasEntries = (date) => {
    const dateKey = date.toDateString();
    return entries[dateKey] && entries[dateKey].length > 0;
  };

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
            const hasAnyEntries = entryCounts.total > 0;

            return (
              <div
                key={cell.key}
                className={`${baseClasses} ${stateClasses} relative`}
                onClick={(e) => {
                  // On touch devices, ensure tooltip is cleared
                  if (isTouchDevice) {
                    if (hoveredDate) {
                      setHoveredDate(null);
                    }
                    if (touchTimeout) {
                      clearTimeout(touchTimeout);
                      setTouchTimeout(null);
                    }
                  } else {
                    // Hide tooltip when clicking (only relevant for desktop)
                    if (hoveredDate) {
                      if (touchTimeout) {
                        clearTimeout(touchTimeout);
                        setTouchTimeout(null);
                      }
                      setHoveredDate(null);
                    }
                  }
                  
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
                onMouseEnter={(e) => {
                  // Only show tooltip on non-touch devices (desktop)
                  if (hasAnyEntries && !isTouchDevice) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    
                    // Calculate tooltip position (centered above the cell)
                    let x = rect.left + rect.width / 2;
                    let y = rect.top - 10;
                    
                    // Ensure tooltip doesn't go off-screen horizontally
                    const tooltipWidth = 150; // Approximate tooltip width
                    if (x - tooltipWidth / 2 < 10) {
                      x = tooltipWidth / 2 + 10;
                    } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
                      x = viewportWidth - tooltipWidth / 2 - 10;
                    }
                    
                    // Ensure tooltip doesn't go off-screen vertically (show below if needed)
                    const tooltipHeight = 150; // Approximate tooltip height
                    let above = true;
                    if (y - tooltipHeight < 10) {
                      y = rect.bottom + 10;
                      above = false;
                    }
                    
                    setTooltipPosition({ x, y, above });
                    setHoveredDate(cell.date);
                  }
                }}
                onMouseLeave={() => {
                  if (!isTouchDevice) {
                    setHoveredDate(null);
                  }
                }}
                onTouchStart={(e) => {
                  // Disable tooltips on touch devices to prevent interference with form interactions
                  // Immediately clear any tooltip state to prevent any interference
                  if (hoveredDate) {
                    setHoveredDate(null);
                  }
                  if (touchTimeout) {
                    clearTimeout(touchTimeout);
                    setTouchTimeout(null);
                  }
                }}
                onTouchEnd={(e) => {
                  // Don't prevent default - allow click to work normally
                }}
                aria-selected={isSelected}
                role="gridcell"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (typeof onSelectDate === 'function') {
                      onSelectDate(cell.date);
                    }
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center min-h-[2.5rem]">
                  <span className={`font-medium ${isTodayDate && !isSelected ? 'text-blue-700' : ''}`}>
                    {cell.dayNumber}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tooltip - Only show on desktop (non-touch devices) */}
      {hoveredDate && !isTouchDevice && (() => {
        const counts = getEntryCounts(hoveredDate);
        return (
          <div
            className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: tooltipPosition.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            <div className="space-y-1">
              <div className="text-sm font-bold mb-2 pb-1 border-b border-gray-700">
                Entries
              </div>
              {counts.meal > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Meals:</span>
                  <span>{counts.meal}</span>
                </div>
              )}
              {counts.sleep > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Sleep:</span>
                  <span>{counts.sleep}</span>
                </div>
              )}
              {counts.measurements > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Measurements:</span>
                  <span>{counts.measurements}</span>
                </div>
              )}
              {counts.exercise > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Exercise:</span>
                  <span>{counts.exercise}</span>
                </div>
              )}
              <div className="pt-1 border-t border-gray-700 mt-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Total:</span>
                  <span>{counts.total}</span>
                </div>
              </div>
            </div>
            {/* Arrow pointing down or up */}
            {tooltipPosition.above ? (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgb(17, 24, 39)',
                }}
              />
            ) : (
              <div
                className="absolute left-1/2 bottom-full -translate-x-1/2"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid rgb(17, 24, 39)',
                }}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default Calendar;

