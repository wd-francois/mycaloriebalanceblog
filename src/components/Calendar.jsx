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
  const [tooltipDate, setTooltipDate] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, above: true });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

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

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipDate && !e.target.closest('[data-calendar-cell]') && !e.target.closest('[data-calendar-tooltip]')) {
        setTooltipDate(null);
      }
    };
    
    if (tooltipDate) {
      // Small delay to avoid immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
        document.addEventListener('touchstart', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside, true);
        document.removeEventListener('touchstart', handleClickOutside, true);
      };
    }
  }, [tooltipDate]);

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

  // Get entries with photos for a given date
  const getEntriesWithPhotos = (date) => {
    const dateKey = date.toDateString();
    const dateEntries = entries[dateKey] || [];
    // Filter entries that have photos with dataUrl
    const entriesWithPhotos = dateEntries.filter(e => {
      return e.photo && (e.photo.dataUrl || e.photo.url);
    });
    return entriesWithPhotos.slice(0, 3); // Limit to 3 photos for tooltip
  };

  // Get total photo count for a given date
  const getPhotoCount = (date) => {
    const dateKey = date.toDateString();
    const dateEntries = entries[dateKey] || [];
    return dateEntries.filter(e => {
      return e.photo && (e.photo.dataUrl || e.photo.url);
    }).length;
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
                  
                  // Only show tooltip if there are entries, otherwise navigate directly
                  if (hasEntries) {
                    // Show tooltip on click (both mobile and desktop)
                    const rect = e.currentTarget.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    
                    // Calculate tooltip position (centered above the cell)
                    let x = rect.left + rect.width / 2;
                    let y = rect.top - 10;
                    
                    // Ensure tooltip doesn't go off-screen horizontally
                    const tooltipWidth = 240;
                    if (x - tooltipWidth / 2 < 10) {
                      x = tooltipWidth / 2 + 10;
                    } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
                      x = viewportWidth - tooltipWidth / 2 - 10;
                    }
                    
                    // Ensure tooltip doesn't go off-screen vertically (show below if needed)
                    // Increase height to accommodate photos
                    const tooltipHeight = 280;
                    let above = true;
                    if (y - tooltipHeight < 10) {
                      y = rect.bottom + 10;
                      above = false;
                    } else if (y + tooltipHeight > viewportHeight - 10 && above) {
                      y = rect.bottom + 10;
                      above = false;
                    }
                    
                    setTooltipPosition({ x, y, above });
                    setTooltipDate(cell.date);
                  } else {
                    // No entries - navigate directly
                    if (typeof onSelectDate === 'function') {
                      onSelectDate(cell.date);
                    }
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

      {/* Tooltip with Add Entry button */}
      {tooltipDate && (() => {
        const counts = getEntryCounts(tooltipDate);
        const photos = getEntriesWithPhotos(tooltipDate);
        const photoCount = getPhotoCount(tooltipDate);
        const dateKey = tooltipDate.toDateString();
        const dateEntries = entries[dateKey] || [];
        
        // Debug logging - always show to help diagnose
        const entriesWithPhotoProperty = dateEntries.filter(e => e.photo);
        console.log('🔍 Calendar Tooltip Debug:', {
          date: dateKey,
          totalEntries: dateEntries.length,
          entriesWithPhotoProperty: entriesWithPhotoProperty.length,
          photoCount,
          photosFound: photos.length,
          '📋 Entry Details:': dateEntries.map((e, idx) => ({
            index: idx,
            id: e.id,
            name: e.name,
            type: e.type,
            hasPhotoProperty: !!e.photo,
            photoType: typeof e.photo,
            photoIsNull: e.photo === null,
            photoIsUndefined: e.photo === undefined,
            photoKeys: e.photo ? Object.keys(e.photo) : 'N/A',
            photoDataUrl: e.photo?.dataUrl ? '✅ exists' : '❌ missing',
            photoUrl: e.photo?.url ? '✅ exists' : '❌ missing',
            fullEntry: e
          }))
        });
        
        return (
          <div
            data-calendar-tooltip
            className="fixed z-[9999] w-[240px] bg-white border border-gray-200 rounded-lg shadow-xl"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: tooltipPosition.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            {/* Arrow */}
            {tooltipPosition.above ? (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid white',
                }}
              />
            ) : (
              <div
                className="absolute left-1/2 bottom-full -translate-x-1/2"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid white',
                }}
              />
            )}
            
            <div className="p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-200">
                {tooltipDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              
              {/* Photos section */}
              {photoCount > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-600 mb-1.5">
                    Photos: <span className="font-semibold text-gray-900">{photoCount}</span>
                  </div>
                  {photos.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {photos.map((entry, idx) => {
                        const photoUrl = entry.photo?.dataUrl || entry.photo?.url;
                        if (!photoUrl) return null;
                        return (
                          <div
                            key={entry.id || idx}
                            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                          >
                            <img
                              src={photoUrl}
                              alt={entry.name || 'Entry photo'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load photo:', entry.id, entry.photo);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {photoCount > photos.length && (
                    <div className="text-xs text-gray-500 mt-1">
                      +{photoCount - photos.length} more {photoCount - photos.length === 1 ? 'photo' : 'photos'}
                    </div>
                  )}
                </div>
              )}
              
              {counts.total > 0 ? (
                <div className="space-y-1 text-xs">
                  {counts.meal > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Meals:</span>
                      <span className="font-semibold text-gray-900">{counts.meal}</span>
                    </div>
                  )}
                  {counts.sleep > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Sleep:</span>
                      <span className="font-semibold text-gray-900">{counts.sleep}</span>
                    </div>
                  )}
                  {counts.measurements > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Measurements:</span>
                      <span className="font-semibold text-gray-900">{counts.measurements}</span>
                    </div>
                  )}
                  {counts.exercise > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Exercise:</span>
                      <span className="font-semibold text-gray-900">{counts.exercise}</span>
                    </div>
                  )}
                  <div className="pt-1 mt-1 border-t border-gray-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-blue-600">{counts.total}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-1">
                  No entries yet
                </div>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTooltipDate(null);
                  if (typeof onSelectDate === 'function') {
                    onSelectDate(tooltipDate);
                  }
                }}
                className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
              >
                {counts.total > 0 ? 'View/Add Entry' : 'Add Entry'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Calendar;

