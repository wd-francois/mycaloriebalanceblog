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
    return JSON.parse(saved);
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

  // Get date from prop or URL parameter
  const selectedDate = useMemo(() => {
    if (dateParam) {
      const date = new Date(dateParam);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    // Fallback to URL parameter if prop not provided
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDate = urlParams.get('date');
      if (urlDate) {
        const date = new Date(urlDate);
        return isNaN(date.getTime()) ? new Date() : date;
      }
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

        // Load entries from IndexedDB
        const dbEntries = await healthDB.getUserEntries();
        
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
        dbEntries.forEach(entry => {
          const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
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
        });
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
  }, []);

  // Get entries for the selected date
  const currentDateEntries = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toDateString();
    return entries[dateKey] || [];
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
            <GroupedEntries
              entries={currentDateEntries.filter(entry => {
                // Filter entries based on enabled features
                if (entry.type === 'meal' && !settings.enableMeals) return false;
                if (entry.type === 'exercise' && !settings.enableExercise) return false;
                if (entry.type === 'sleep' && !settings.enableSleep) return false;
                if (entry.type === 'measurements' && !settings.enableMeasurements) return false;
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

