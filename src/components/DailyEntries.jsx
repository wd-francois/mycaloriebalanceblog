// src/components/DailyEntries.jsx
import React, { useState, useEffect, useMemo } from 'react';
import GroupedEntries from './GroupedEntries';
import healthDB from '../lib/database.js';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext.jsx';
import { formatDate, formatTime } from '../lib/utils';
import { exportToCSV } from '../lib/exportUtils';
import { useHealthData } from '../hooks/useHealthData';

// Simple toast component
const Toast = ({ message, type }) => (
  <div className="fixed top-4 inset-x-0 flex justify-center pointer-events-none">
    <div
      className={`px-4 py-2 rounded-md shadow-md text-white ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  </div>
);

const DailyEntriesContent = ({ date: dateParam }) => {
  const { entries, loading, isDBInitialized, deleteEntry } = useHealthData();
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const { settings } = useSettings();

  // Toast state
  const [toast, setToast] = useState(null);

  // Track URL to force re‑render when it changes
  const [currentUrl, setCurrentUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  });

  // Update URL state when location changes (client‑side navigation or page reloads)
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
    checkUrl();
    const timeout = setTimeout(checkUrl, 100);
    window.addEventListener('popstate', checkUrl);
    window.addEventListener('focus', checkUrl);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('popstate', checkUrl);
      window.removeEventListener('focus', checkUrl);
    };
  }, [currentUrl]);

  // Derive selected date from URL or prop
  const selectedDate = useMemo(() => {
    let dateToUse = null;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDateParam = urlParams.get('date');
      if (urlDateParam) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(urlDateParam)) {
          const [y, m, d] = urlDateParam.split('-').map(Number);
          dateToUse = new Date(y, m - 1, d);
        } else {
          dateToUse = new Date(urlDateParam);
        }
      }
    }
    if (!dateToUse && dateParam) {
      if (typeof dateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const [y, m, d] = dateParam.split('-').map(Number);
        dateToUse = new Date(y, m - 1, d);
      } else {
        dateToUse = new Date(dateParam);
      }
    }
    if (dateToUse && !isNaN(dateToUse.getTime())) {
      return new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, [dateParam, currentUrl]);

  // Loading flag
  useEffect(() => {
    if (!loading) setEntriesLoaded(true);
  }, [loading]);

  // Debug when date changes
  useEffect(() => {
    console.log('=== SELECTED DATE CHANGED ===');
    console.log('Selected date:', selectedDate);
    console.log('Formatted:', formatDate(selectedDate));
  }, [selectedDate]);

  // Filter entries for the selected date
  const currentDateEntries = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toDateString();
    let found = entries[dateKey] || [];
    if (found.length === 0 && Object.keys(entries).length > 0) {
      const iso = selectedDate.toISOString().split('T')[0];
      Object.keys(entries).some(key => {
        const keyDate = new Date(key);
        if (!isNaN(keyDate.getTime())) {
          if (keyDate.toISOString().split('T')[0] === iso) {
            found = entries[key];
            return true;
          }
        }
        return false;
      });
    }
    return found;
  }, [entries, selectedDate]);

  // Apply settings filters
  const filteredDateEntries = useMemo(() => {
    return currentDateEntries.filter(entry => {
      if (entry.type === 'meal' && !settings.enableMeals) return false;
      if (entry.type === 'exercise' && !settings.enableExercise) return false;
      if (entry.type === 'sleep' && !settings.enableSleep) return false;
      if (entry.type === 'measurements' && !settings.enableMeasurements) return false;
      return true;
    });
  }, [currentDateEntries, settings]);

  // Delete handler with toast
  const handleDelete = async entryId => {
    if (!entryId) return;
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    await deleteEntry(entryId, selectedDate);
    setToast({ message: 'Entry deleted', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = entry => {
    const ds = selectedDate.toISOString().split('T')[0];
    window.location.href = `/?date=${ds}&edit=${entry.id}`;
  };

  const handleInfoClick = entry => {
    const ds = selectedDate.toISOString().split('T')[0];
    window.location.href = `/?date=${ds}&info=${entry.id}`;
  };

  // Drag placeholders (read‑only view)
  const handleDragStart = () => { };
  const handleDragEnd = () => { };
  const handleDragOver = () => { };
  const handleDrop = () => { };

  // Helper for first‑time users (no entries at all)
  const isFirstTimeUser = useMemo(() => Object.keys(entries).length === 0, [entries]);

  // Format date string for URLs
  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[var(--color-bg-base)]" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading entries…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--color-bg-base)] flex flex-col" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 w-full">
          {/* Date Header */}
          <div className="mb-4 text-center">
            <div className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {formatDate(selectedDate)}
            </div>
          </div>

          <div className="bg-white dark:bg-[var(--color-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-lg p-6 md:p-8">
            {filteredDateEntries.length > 0 ? (
              <>
                {/* Action Buttons */}
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-start gap-2 md:gap-3">
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
                {/* Add New Entry Button */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      window.location.replace(`/?date=${dateStr}&add=true`);
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add a New Entry
                  </button>
                </div>
              </>
            ) : (
              !loading && entriesLoaded && filteredDateEntries.length === 0 && (
                <div className="text-center py-12">
                  {/* Onboarding banner */}
                  {isFirstTimeUser && (
                    <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                      <h4 className="font-semibold text-lg mb-2">Welcome to Health Tracker!</h4>
                      <p className="text-sm">It looks like you're new here. Start by adding your first entry to track your health journey.</p>
                    </div>
                  )}
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No entries for this date</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add your first entry to get started</p>
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        window.location.replace(`/?date=${dateStr}&add=true`);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add a New Entry
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DailyEntries = ({ date }) => (
  <SettingsProvider>
    <DailyEntriesContent date={date} />
  </SettingsProvider>
);

export default DailyEntries;
