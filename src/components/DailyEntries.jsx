import React, { useState, useEffect, useMemo } from 'react';
import GroupedEntries from './GroupedEntries';
import healthDB from '../lib/database.js';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext.jsx';

function formatDate(date) {
  return date?.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTime({ hour, minute, period }) {
  const mm = minute.toString().padStart(2, '0');
  return `${hour}:${mm} ${period}`;
}

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
  const { settings } = useSettings();

  // Log the received date prop
  useEffect(() => {
    console.log('DailyEntriesContent - Received date param:', dateParam);
  }, [dateParam]);

  // Get date from prop or URL parameter
  const selectedDate = useMemo(() => {
    let dateToUse = null;
    
    if (dateParam) {
      // If dateParam is in YYYY-MM-DD format, parse it correctly
      if (typeof dateParam === 'string' && dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateParam.split('-').map(Number);
        dateToUse = new Date(year, month - 1, day);
      } else {
        dateToUse = new Date(dateParam);
      }
    } else if (typeof window !== 'undefined') {
      // Fallback to URL parameter if prop not provided
      const urlParams = new URLSearchParams(window.location.search);
      const urlDate = urlParams.get('date');
      if (urlDate) {
        // If URL date is in YYYY-MM-DD format, parse it correctly
        if (urlDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = urlDate.split('-').map(Number);
          dateToUse = new Date(year, month - 1, day);
        } else {
          dateToUse = new Date(urlDate);
        }
      }
    }
    
    // Normalize date to midnight to avoid timezone issues
    if (dateToUse && !isNaN(dateToUse.getTime())) {
      const normalized = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
      return normalized;
    }
    
    return new Date();
  }, [dateParam]);

  // Load entries from database
  useEffect(() => {
    const loadEntries = async () => {
      if (typeof window === 'undefined') return;
      
      setLoading(true);
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
          
          // Normalize date to midnight to avoid timezone issues
          if (!isNaN(entryDate.getTime())) {
            entryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
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
          } else {
            console.log(`Skipping entry ${index}: invalid date`, entry.date, entryDate);
          }
        });
        
        console.log('Loaded entries:', Object.keys(formattedEntries).length, 'dates');
        console.log('Formatted entries keys:', Object.keys(formattedEntries));
        if (Object.keys(formattedEntries).length > 0) {
          console.log('Sample entry:', formattedEntries[Object.keys(formattedEntries)[0]][0]);
        }
        setEntries(formattedEntries);
      } catch (error) {
        console.error('Error loading entries from IndexedDB:', error);
        // Fallback to localStorage
        const savedEntries = loadFromLocalStorage();
        setEntries(savedEntries);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []); // Only load once on mount

  // Reload entries when selectedDate changes (if needed)
  useEffect(() => {
    // This ensures entries are available when date changes
    // The entries are already loaded, just need to ensure state is updated
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
    
    // Try exact match first
    let foundEntries = entries[dateKey] || [];
    
    // If no exact match, try to find entries with similar dates (handle timezone issues)
    if (foundEntries.length === 0 && Object.keys(entries).length > 0) {
      console.log('No exact match, trying to find similar dates...');
      // Try matching by date components
      const selectedYear = normalizedSelectedDate.getFullYear();
      const selectedMonth = normalizedSelectedDate.getMonth();
      const selectedDay = normalizedSelectedDate.getDate();
      
      Object.keys(entries).forEach(key => {
        const keyDate = new Date(key);
        if (keyDate.getFullYear() === selectedYear && 
            keyDate.getMonth() === selectedMonth && 
            keyDate.getDate() === selectedDay) {
          foundEntries = entries[key];
          console.log('Found entries using date components match:', key);
        }
      });
    }
    
    console.log('Selected date:', normalizedSelectedDate, 'Date key:', dateKey, 'Found entries:', foundEntries.length);
    console.log('Available date keys:', Object.keys(entries));
    if (foundEntries.length > 0) {
      console.log('Sample found entry:', foundEntries[0]);
    }
    
    return foundEntries;
  }, [entries, selectedDate]);

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
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {formatDate(selectedDate)}
              </h1>
              {currentDateEntries.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentDateEntries.length} entry{currentDateEntries.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors duration-200"
                title="Export daily entries"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              <a
                href="/statistics/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors duration-200"
                title="View statistics"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Stats
              </a>
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Centered vertically */}
      <div className="flex-1 flex items-center justify-center pb-24">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg p-6 md:p-8">
            {currentDateEntries.length === 0 ? (
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
            ) : (
              <GroupedEntries
                entries={currentDateEntries.filter(entry => {
                  // Filter entries based on enabled features
                  const beforeFilter = currentDateEntries.length;
                  if (entry.type === 'meal' && !settings.enableMeals) {
                    console.log('Filtered out meal entry:', entry.name);
                    return false;
                  }
                  if (entry.type === 'exercise' && !settings.enableExercise) {
                    console.log('Filtered out exercise entry:', entry.name);
                    return false;
                  }
                  if (entry.type === 'sleep' && !settings.enableSleep) {
                    console.log('Filtered out sleep entry:', entry.name);
                    return false;
                  }
                  if (entry.type === 'measurements' && !settings.enableMeasurements) {
                    console.log('Filtered out measurements entry:', entry.name);
                    return false;
                  }
                  return true;
                })}
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

