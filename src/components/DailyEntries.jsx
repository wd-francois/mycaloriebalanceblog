import React, { useState, useEffect, useMemo } from 'react';
import GroupedEntries from './GroupedEntries';
import healthDB from '../lib/database.js';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext.jsx';
import { formatDate, formatTime } from '../lib/utils';

function loadFromLocalStorage() {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('healthEntries');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    
    // Convert localStorage entries to proper format with normalized dates
    const formattedEntries = {};
    Object.keys(parsed).forEach(dateKey => {
      const dateEntries = parsed[dateKey];
      if (Array.isArray(dateEntries)) {
        dateEntries.forEach(entry => {
          if (!entry || !entry.date) return;
          
          let entryDate;
          if (entry.date instanceof Date) {
            entryDate = entry.date;
          } else if (typeof entry.date === 'string') {
            entryDate = new Date(entry.date);
          } else {
            entryDate = new Date(entry.date);
          }
          
          // Normalize date to midnight to avoid timezone issues
          if (!isNaN(entryDate.getTime())) {
            entryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            const normalizedDateKey = entryDate.toDateString();
            
            if (!formattedEntries[normalizedDateKey]) {
              formattedEntries[normalizedDateKey] = [];
            }
            
            formattedEntries[normalizedDateKey].push({
              ...entry,
              date: entryDate
            });
          }
        });
      }
    });
    
    return formattedEntries;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return {};
  }
}

const DailyEntriesContent = ({ date: dateParam }) => {
  const [entries, setEntries] = useState({});
  const [isDBInitialized, setIsDBInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
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

  // Load entries from database
  useEffect(() => {
    const loadEntries = async () => {
      if (typeof window === 'undefined') return;
      
      setLoading(true);
      setEntriesLoaded(false);
      // Keep previous entries while loading to avoid showing "No entries" during reload
      try {
        // Initialize IndexedDB
        await healthDB.init();
        setIsDBInitialized(true);

        // Load entries from IndexedDB - use getAllUserEntries to get all entries
        const dbEntries = await healthDB.getAllUserEntries();
        
        // Load photos separately and merge with entries
        let photoEntries = [];
        try {
          photoEntries = await healthDB.getAllPhotoEntries();
        } catch (photoError) {
          console.warn('Could not load photo entries:', photoError);
        }

        // Create a map of photos by entry ID
        const photosByEntryId = {};
        photoEntries.forEach(photoEntry => {
          const entryId = photoEntry.entryId || photoEntry.id;
          if (entryId && photoEntry.photo) {
            photosByEntryId[entryId] = photoEntry.photo;
          }
        });

        // Convert IndexedDB entries to the format expected by the component
        const formattedEntries = {};
        console.log('Processing', dbEntries.length, 'entries from IndexedDB');
        dbEntries.forEach((entry, index) => {
          if (!entry || !entry.date) {
            console.log(`Skipping entry ${index}: missing date`, entry);
            return;
          }
          
          let entryDate;
          if (entry.date instanceof Date) {
            entryDate = entry.date;
          } else if (typeof entry.date === 'string') {
            // Handle YYYY-MM-DD format
            if (entry.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = entry.date.split('-').map(Number);
              entryDate = new Date(year, month - 1, day);
            } else {
              entryDate = new Date(entry.date);
            }
          } else {
            entryDate = new Date(entry.date);
          }
          
          // Validate date is valid before proceeding
          if (isNaN(entryDate.getTime())) {
            console.log(`Skipping entry ${index}: invalid date`, entry.date, entryDate);
            return;
          }
          
          // Normalize date to midnight to avoid timezone issues
          entryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          
          // Double-check normalized date is valid
          if (isNaN(entryDate.getTime())) {
            console.log(`Skipping entry ${index}: invalid normalized date`, entry.date);
            return;
          }
          
          const dateKey = entryDate.toDateString();
          
          if (!formattedEntries[dateKey]) {
            formattedEntries[dateKey] = [];
          }
          
          const entryPhoto = photosByEntryId[entry.id] || entry.photo;
          const mergedEntry = {
            ...entry,
            date: entryDate
          };
          if (entryPhoto && (entryPhoto.dataUrl || entryPhoto.url)) {
            mergedEntry.photo = entryPhoto;
          }
          formattedEntries[dateKey].push(mergedEntry);
          console.log(`Added entry ${index} to date key: ${dateKey}`, mergedEntry.name || mergedEntry.type);
        });
        
        console.log('Loaded entries:', Object.keys(formattedEntries).length, 'dates');
        console.log('Formatted entries keys:', Object.keys(formattedEntries));
        if (Object.keys(formattedEntries).length > 0) {
          console.log('Sample entry:', formattedEntries[Object.keys(formattedEntries)[0]][0]);
          // Log all date keys for debugging
          Object.keys(formattedEntries).forEach(key => {
            console.log(`Date key "${key}": ${formattedEntries[key].length} entries`);
          });
        }
        setEntries(formattedEntries);
        setEntriesLoaded(true);
        console.log('Entries loaded and setEntriesLoaded(true) called');
      } catch (error) {
        console.error('Error loading entries from IndexedDB:', error);
        // Fallback to localStorage
        const savedEntries = loadFromLocalStorage();
        setEntries(savedEntries);
        setEntriesLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [currentUrl, selectedDate]); // Reload when URL changes OR when selected date changes (e.g., when navigating from another page)

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

    try {
      // Remove from state
      const dateKey = selectedDate.toDateString();
      setEntries((prev) => {
        const updated = { ...prev };
        if (updated[dateKey]) {
          updated[dateKey] = updated[dateKey].filter(e => e.id !== entryId);
        }
        return updated;
      });

      // Delete from IndexedDB
      if (isDBInitialized) {
        await healthDB.deleteUserEntry(entryId);
      }

      // Update localStorage
      const dateKeyStr = selectedDate.toDateString();
      const savedEntries = loadFromLocalStorage();
      if (savedEntries[dateKeyStr]) {
        savedEntries[dateKeyStr] = savedEntries[dateKeyStr].filter(e => e.id !== entryId);
        localStorage.setItem('healthEntries', JSON.stringify(savedEntries));
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
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

  // Export to CSV
  const exportToCSV = () => {
    if (currentDateEntries.length === 0) {
      alert('No entries to export');
      return;
    }

    const headers = ['Type', 'Name', 'Time', 'Amount', 'Calories', 'Protein', 'Carbs', 'Fats', 'Notes'];
    const rows = currentDateEntries.map(entry => {
      const timeStr = entry.time ? formatTime(entry.time) : '';
      return [
        entry.type || '',
        entry.name || '',
        timeStr,
        entry.amount || '',
        entry.calories || '',
        entry.protein || '',
        entry.carbs || '',
        entry.fats || '',
        entry.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${selectedDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Drag handlers (no-op for read-only view)
  const handleDragStart = () => {};
  const handleDragEnd = () => {};
  const handleDragOver = () => {};
  const handleDrop = () => {};

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a
                href={`/?date=${dateStr}&add=true`}
                className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Add New Entry"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>
              <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate pr-2">
                {formatDate(selectedDate)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/settings/"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-blue-100 hover:shadow-md"
                title="Open settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>My Settings</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Centered vertically */}
      <div className="flex-1 flex items-center justify-center pb-24">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg p-6 md:p-8">
            {/* Show entries if filtered entries exist */}
            {filteredDateEntries.length > 0 ? (
              <>
                {/* Heading and Action Buttons */}
                <div className="flex items-center justify-between gap-3 mb-6 pb-6 border-b border-gray-200">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Today's Entries</h2>
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
                    onClick={exportToCSV}
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
              </>
            ) : (
              !loading && entriesLoaded && filteredDateEntries.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No entries for this date</h3>
                  <p className="mt-1 text-sm text-gray-500">Add your first entry from the calendar page</p>
                  <div className="mt-6">
                    <a
                      href="/"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Go to Calendar
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

