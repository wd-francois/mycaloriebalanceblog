import { useState, useEffect } from 'react';
import healthDB from '../lib/database.js';
import { calculateSleepDuration, parseDateLocalYYYYMMDD, formatDateForDisplay } from '../lib/dateUtils';
import { formatTime } from '../lib/utils';

const defaultBedtime = { hour: 10, minute: 0, period: 'PM' };
const defaultWaketime = { hour: 6, minute: 0, period: 'AM' };

const getDateFromUrl = () => {
  if (typeof window === 'undefined') return new Date();
  const params = new URLSearchParams(window.location.search);
  const dateStr = params.get('date');
  if (dateStr) {
    const d = parseDateLocalYYYYMMDD(dateStr);
    if (d) return d;
  }
  return new Date();
};

const AddSleepForm = () => {
  const [bedtime, setBedtime] = useState(defaultBedtime);
  const [waketime, setWaketime] = useState(defaultWaketime);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedDate(getDateFromUrl());
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const editId = params.get('edit');
    if (editId) {
      const id = parseInt(editId, 10);
      if (!isNaN(id)) {
        setEditingId(id);
        loadEntry(id);
        return;
      }
    }
    setLoading(false);
  }, []);

  const loadEntry = async (id) => {
    try {
      if (!healthDB.db) await healthDB.init();
      const allEntries = await healthDB.getAllUserEntries();
      const entry = allEntries.find((e) => e.id === id);
      if (entry && (entry.type === 'sleep' || !entry.type)) {
        setBedtime(entry.bedtime || defaultBedtime);
        setWaketime(entry.waketime || defaultWaketime);
        if (entry.date) {
          const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
          if (!isNaN(d.getTime())) setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        }
      }
    } catch (e) {
      console.warn('Load sleep entry failed, trying localStorage:', e);
      try {
        const saved = localStorage.getItem('healthEntries');
        if (saved) {
          const parsed = JSON.parse(saved);
          for (const dateKey of Object.keys(parsed)) {
            const arr = parsed[dateKey];
            if (Array.isArray(arr)) {
              const entry = arr.find((e) => e.id === id);
              if (entry && (entry.type === 'sleep' || !entry.type)) {
                setBedtime(entry.bedtime || defaultBedtime);
                setWaketime(entry.waketime || defaultWaketime);
                if (entry.date) {
                  const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
                  if (!isNaN(d.getTime())) setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                }
                break;
              }
            }
          }
        }
      } catch (_) {}
    }
    setLoading(false);
  };

  const saveEntry = async (entry) => {
    if (!healthDB.db) await healthDB.init();
    await healthDB.saveUserEntry(entry);
  };

  const saveToLocalStorage = (entry) => {
    const dateKey = entry.date instanceof Date ? entry.date.toDateString() : new Date(entry.date).toDateString();
    const currentData = JSON.parse(localStorage.getItem('healthEntries') || '{}');
    if (!currentData[dateKey]) currentData[dateKey] = [];
    if (editingId) {
      const idx = currentData[dateKey].findIndex((e) => e.id === editingId);
      if (idx >= 0) currentData[dateKey][idx] = { ...entry, date: entry.date };
      else currentData[dateKey].push(entry);
    } else {
      currentData[dateKey].push(entry);
    }
    localStorage.setItem('healthEntries', JSON.stringify(currentData));
  };

  const handleSave = async () => {
    const date = selectedDate || getDateFromUrl();
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const time = `${formatTime(bedtime)} - ${formatTime(waketime)}`;
    const duration = calculateSleepDuration(bedtime, waketime);

    const entry = {
      id: editingId || Date.now(),
      name: 'Sleep',
      type: 'sleep',
      date: normalizedDate,
      time,
      bedtime: { ...bedtime },
      waketime: { ...waketime },
      duration,
    };

    setSaving(true);
    try {
      try {
        await saveEntry(entry);
      } catch (dbErr) {
        console.warn('IndexedDB save failed, using localStorage:', dbErr);
        saveToLocalStorage(entry);
      }
      alert(editingId ? 'Sleep entry updated.' : 'Sleep entry added.');
      window.location.href = '/';
    } catch (err) {
      console.error('Error saving sleep entry:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/';
  };

  if (loading && editingId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  const date = selectedDate || getDateFromUrl();
  const dateString = date ? formatDateForDisplay(date, 'DD/MM/YYYY') : formatDateForDisplay(new Date(), 'DD/MM/YYYY');

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Heading inside card, X top right */}
        <div className="px-6 sm:px-8 lg:px-10 pt-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white m-0">
              {editingId ? 'Edit Sleep' : 'Add Sleep'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-0">
              {editingId ? 'Update this sleep entry' : 'Log your sleep times'}
            </p>
          </div>
          <a
            href="/"
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>

        <div className="p-6 sm:p-8 lg:p-10 space-y-8">
          {/* Date card */}
          <section className="space-y-4" aria-label="Date">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </label>
              <p className="text-base text-gray-900 dark:text-white font-medium">{dateString}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bedtime
              </label>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-600 mb-1">Hour</label>
                  <select
                    className="w-16 px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                    value={bedtime.hour}
                    onChange={(e) => setBedtime((s) => ({ ...s, hour: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <span className="text-gray-400 text-2xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-600 mb-1">Minute</label>
                  <select
                    className="w-16 px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                    value={bedtime.minute}
                    onChange={(e) => setBedtime((s) => ({ ...s, minute: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-600 mb-1">Period</label>
                  <select
                    className="w-20 px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                    value={bedtime.period}
                    onChange={(e) => setBedtime((s) => ({ ...s, period: e.target.value }))}
                  >
                    <option value="PM">PM</option>
                    <option value="AM">AM</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wake Time
              </label>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-600 mb-1">Hour</label>
                  <select
                    className="w-16 px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                    value={waketime.hour}
                    onChange={(e) => setWaketime((s) => ({ ...s, hour: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <span className="text-gray-400 text-2xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-600 mb-1">Minute</label>
                  <select
                    className="w-16 px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                    value={waketime.minute}
                    onChange={(e) => setWaketime((s) => ({ ...s, minute: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-600 mb-1">Period</label>
                  <select
                    className="w-20 px-3 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                    value={waketime.period}
                    onChange={(e) => setWaketime((s) => ({ ...s, period: e.target.value }))}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Sleep Duration</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {calculateSleepDuration(bedtime, waketime)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatTime(bedtime)} - {formatTime(waketime)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 sm:px-8 lg:px-10 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="h-12 px-6 py-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-12 px-6 py-0 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Sleep Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSleepForm;
