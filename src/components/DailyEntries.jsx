import React, { useState, useEffect, useMemo } from 'react';
import GroupedEntries from './GroupedEntries';
import healthDB from '../lib/database.js';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext.jsx';
import { formatDate, formatTime } from '../lib/utils';
import { exportToCSV } from '../lib/exportUtils';
import { useHealthData } from '../hooks/useHealthData';



const DailyEntriesContent = ({ date: dateParam }) => {
  const { entries, loading, isDBInitialized, deleteEntry } = useHealthData();
  const [entriesLoaded, setEntriesLoaded] = useState(false); // Kept for compatibility if needed, or remove
  const { settings } = useSettings();

  // Track URL to force re-render when it changes
  const [currentUrl, setCurrentUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  });

  // Update URL state when location changes (for client-side navigation or page reloads)
  useEffect(() => {
    const checkUrl = () => {
      if (typeof window !== 'undefined') {
        const newUrl = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const urlDate = urlParams.get('date');
        console.log('Checking URL - Full URL:', newUrl, 'Date param:', urlDate);

        if (newUrl !== currentUrl) {
          console.log('URL changed from', currentUrl, 'to', newUrl);
          setCurrentUrl(newUrl);
        }
      }
    };

    // Check immediately on mount
    checkUrl();

    // Also check after a short delay to catch any timing issues
    const timeout = setTimeout(checkUrl, 100);

    // Listen for navigation events
    window.addEventListener('popstate', checkUrl);

    // Also check on focus (in case user navigated away and back)
    window.addEventListener('focus', checkUrl);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('popstate', checkUrl);
      window.removeEventListener('focus', checkUrl);
    };
  }, [currentUrl]);

  // Get date from prop or URL parameter - always read from URL to ensure it's current
  const selectedDate = useMemo(() => {
    let dateToUse = null;

    // Always check URL first (most reliable for navigation)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDateParam = urlParams.get('date');
      console.log('URL date param:', urlDateParam);
      if (urlDateParam) {
        // If URL date is in YYYY-MM-DD format, parse it correctly
        if (urlDateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = urlDateParam.split('-').map(Number);
          dateToUse = new Date(year, month - 1, day);
          console.log('Using URL date:', urlDateParam, '->', dateToUse, '->', dateToUse.toDateString());
        } else {
          dateToUse = new Date(urlDateParam);
          console.log('Using URL date (parsed):', urlDateParam, '->', dateToUse, '->', dateToUse.toDateString());
        }
      } else {
        console.log('No date param in URL, will use prop or today');
      }
    }

    // Fallback to prop if URL date not available
    if (!dateToUse && dateParam) {
      // If dateParam is in YYYY-MM-DD format, parse it correctly
      if (typeof dateParam === 'string' && dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateParam.split('-').map(Number);
        dateToUse = new Date(year, month - 1, day);
        console.log('Using prop date:', dateParam, '->', dateToUse);
      } else {
        dateToUse = new Date(dateParam);
        console.log('Using prop date (parsed):', dateParam, '->', dateToUse);
      }
    }

    // Normalize date to midnight to avoid timezone issues
    if (dateToUse && !isNaN(dateToUse.getTime())) {
      const normalized = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
      console.log('Selected date normalized:', normalized.toISOString().split('T')[0], 'Date key:', normalized.toDateString());
      return normalized;
    }

    // Last resort: today's date
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    console.log('Using today as fallback:', normalizedToday.toISOString().split('T')[0]);
    return normalizedToday;
  }, [dateParam, currentUrl]); // Re-compute when dateParam or URL changes

  // Entries loaded via hook
  useEffect(() => {
    if (!loading) setEntriesLoaded(true);
  }, [loading]);

  // Log when selectedDate changes
  useEffect(() => {
    console.log('=== SELECTED DATE CHANGED ===');
    console.log('Selected date:', selectedDate);
    console.log('Selected date ISO:', selectedDate?.toISOString().split('T')[0]);
    console.log('Selected date formatted:', formatDate(selectedDate));
    console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.log('URL search params:', typeof window !== 'undefined' ? window.location.search : 'N/A');
  }, [selectedDate]);

  // Get entries for the selected date
  const currentDateEntries = useMemo(() => {
    if (!selectedDate) {
      console.log('No selected date');
      return [];
    }

    // Normalize selected date to ensure consistent matching
    const normalizedSelectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const dateKey = normalizedSelectedDate.toDateString();

    console.log('=== FILTERING ENTRIES ===');
    console.log('Selected date:', normalizedSelectedDate);
    console.log('Selected date ISO:', normalizedSelectedDate.toISOString().split('T')[0]);
    console.log('Date key:', dateKey);
    console.log('Total entries loaded:', Object.keys(entries).length, 'dates');
    console.log('Available date keys:', Object.keys(entries));

    // Try exact match first
    let foundEntries = entries[dateKey] || [];

    // If no exact match, try to find entries by comparing ISO date strings (more robust)
    if (foundEntries.length === 0 && Object.keys(entries).length > 0) {
      const selectedISO = normalizedSelectedDate.toISOString().split('T')[0];
      console.log('No exact match, trying ISO date match:', selectedISO);

      // Check each date key to see if it matches the selected date
      Object.keys(entries).forEach(key => {
        try {
          // First try parsing the key as a date string
          let keyDate = new Date(key);

          // If that doesn't work, check the actual entry dates in that key
          if (isNaN(keyDate.getTime()) && entries[key].length > 0) {
            const firstEntry = entries[key][0];
            if (firstEntry && firstEntry.date) {
              if (firstEntry.date instanceof Date) {
                keyDate = firstEntry.date;
              } else if (typeof firstEntry.date === 'string') {
                // Handle YYYY-MM-DD format
                if (firstEntry.date.match(/^\d{4}-\d{2}-\d{2}/)) {
                  const [year, month, day] = firstEntry.date.split('T')[0].split('-').map(Number);
                  keyDate = new Date(year, month - 1, day);
                } else {
                  keyDate = new Date(firstEntry.date);
                }
              } else {
                keyDate = new Date(firstEntry.date);
              }
            }
          }

          if (!isNaN(keyDate.getTime())) {
            const normalizedKeyDate = new Date(keyDate.getFullYear(), keyDate.getMonth(), keyDate.getDate());
            const keyISO = normalizedKeyDate.toISOString().split('T')[0];
            if (keyISO === selectedISO) {
              console.log(`Found matching date key by ISO: "${key}" matches "${selectedISO}"`);
              foundEntries = entries[key];
            }
          }
        } catch (e) {
          console.log('Error parsing date key:', key, e);
        }
      });
    }

    console.log('Found entries for this date:', foundEntries.length);
    if (foundEntries.length > 0) {
      console.log('Sample found entry:', foundEntries[0]);
      console.log('Sample entry date:', foundEntries[0].date, 'Date key:', foundEntries[0].date?.toDateString());
    } else {
      console.log('No entries found for date key:', dateKey);
      // Debug: show what entries exist
      Object.keys(entries).forEach(key => {
        console.log(`  Date key "${key}" has ${entries[key].length} entries`);
      });
    }

    return foundEntries;
  }, [entries, selectedDate]);

  // Compute filtered entries once
  const filteredDateEntries = useMemo(() => {
    return currentDateEntries.filter(entry => {
      if (entry.type === 'meal' && !settings.enableMeals) return false;
      if (entry.type === 'exercise' && !settings.enableExercise) return false;
      if (entry.type === 'sleep' && !settings.enableSleep) return false;
      if (entry.type === 'measurements' && !settings.enableMeasurements) return false;
      return true;
    });
  }, [currentDateEntries, settings]);

  // Handle delete
  const handleDelete = async (entryId) => {
    if (!entryId) return;

    const confirmed = window.confirm('Are you sure you want to delete this entry?');
    if (!confirmed) return;

    await deleteEntry(entryId, selectedDate);
  };

  // Handle edit - navigate back to main page with date selected
  const handleEdit = (entry) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    window.location.href = `/?date=${dateStr}&edit=${entry.id}`;
  };

  // Handle info click - navigate back to main page
  const handleInfoClick = (entry) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    window.location.href = `/?date=${dateStr}&info=${entry.id}`;
  };

  // Format selected date as YYYY-MM-DD for URL
  const dateStr = selectedDate ? (() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })() : (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();



  // Drag handlers (no-op for read-only view)
  const handleDragStart = () => { };
  const handleDragEnd = () => { };
  const handleDragOver = () => { };
  const handleDrop = () => { };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      {/* Content - Centered vertically */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg p-6 md:p-8">
            {/* Show entries if filtered entries exist */}
            {filteredDateEntries.length > 0 ? (
              <>
                {/* Heading and Action Buttons */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">{formatDate(selectedDate)}</h2>
                    <div className="flex items-center gap-2 md:gap-3">
                    <a
                      href={`/daily-calories?date=${dateStr}`}
                      className="flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors duration-200"
                      title={`View calorie intake graph (${dateStr})`}
                    >
                      <span className="whitespace-nowrap">Calories</span>
                    </a>
                    <a
                      href={`/daily-sleep?date=${dateStr}`}
                      className="flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-100 transition-colors duration-200"
                      title="View sleep statistics"
                    >
                      <span className="whitespace-nowrap">Sleep</span>
                    </a>
                    <a
                      href={`/daily-weight?date=${dateStr}`}
                      className="flex items-center justify-center px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg border border-green-100 transition-colors duration-200"
                      title="View weight progress"
                    >
                      <span className="whitespace-nowrap">Weight</span>
                    </a>
                    <button
                      onClick={() => exportToCSV(entries, selectedDate)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors duration-200"
                      title="Export daily entries"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="whitespace-nowrap">Export</span>
                    </button>
                  </div>
                  </div>
                </div>
                <GroupedEntries
                  key={`${dateStr}-${filteredDateEntries.length}`}
                  entries={filteredDateEntries}
                  formatTime={formatTime}
                  settings={settings}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onInfoClick={handleInfoClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />

                {/* Make A New Entry Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a
                    href={`/?date=${dateStr}&add=true`}
                    onClick={(e) => {
                      // Use replace for faster navigation without adding to history
                      e.preventDefault();
                      window.location.replace(`/?date=${dateStr}&add=true`);
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add a New Entry
                  </a>
                </div>
              </>
            ) : (
              !loading && entriesLoaded && filteredDateEntries.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No entries for this date</h3>
                  <p className="mt-1 text-sm text-gray-500">Add your first entry to get started</p>
                  <div className="mt-6">
                    <a
                      href={`/?date=${dateStr}&add=true`}
                      onClick={(e) => {
                        // Use replace for faster navigation without adding to history
                        e.preventDefault();
                        window.location.replace(`/?date=${dateStr}&add=true`);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add a New Entry
                    </a>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DailyEntries = ({ date }) => {
  return (
    <SettingsProvider>
      <DailyEntriesContent date={date} />
    </SettingsProvider>
  );
};

export default DailyEntries;

