import { useState, useEffect } from 'react';
import healthDB from '../lib/database.js';
import TimePicker from './TimePicker.jsx';
import { getCurrentTimeParts, parseDateLocalYYYYMMDD, formatDateForDisplay } from '../lib/dateUtils.js';
import { formatTime } from '../lib/utils';
import { useSettings, SettingsProvider } from '../contexts/SettingsContext.jsx';

const initialForm = {
  weight: '',
  neck: '',
  shoulders: '',
  chest: '',
  waist: '',
  thigh: '',
  arm: '',
  calf: '',
  chestSkinfold: '',
  abdominalSkinfold: '',
  thighSkinfold: '',
  tricepSkinfold: '',
  subscapularSkinfold: '',
  suprailiacSkinfold: '',
  notes: '',
};

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

const AddMeasurementsFormPageInner = () => {
  const settings = useSettings();
  const [formState, setFormState] = useState(initialForm);
  const [selectedDate, setSelectedDate] = useState(null);
  const [time, setTime] = useState(() => getCurrentTimeParts());
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
      if (entry && (entry.type === 'measurements' || !entry.type)) {
        setFormState({
          weight: entry.weight != null ? String(entry.weight) : '',
          neck: entry.neck != null ? String(entry.neck) : '',
          shoulders: entry.shoulders != null ? String(entry.shoulders) : '',
          chest: entry.chest != null ? String(entry.chest) : '',
          waist: entry.waist != null ? String(entry.waist) : '',
          thigh: entry.thigh != null ? String(entry.thigh) : '',
          arm: entry.arm != null ? String(entry.arm) : '',
          calf: entry.calf != null ? String(entry.calf) : '',
          chestSkinfold: entry.chestSkinfold != null ? String(entry.chestSkinfold) : '',
          abdominalSkinfold: entry.abdominalSkinfold != null ? String(entry.abdominalSkinfold) : '',
          thighSkinfold: entry.thighSkinfold != null ? String(entry.thighSkinfold) : '',
          tricepSkinfold: entry.tricepSkinfold != null ? String(entry.tricepSkinfold) : '',
          subscapularSkinfold: entry.subscapularSkinfold != null ? String(entry.subscapularSkinfold) : '',
          suprailiacSkinfold: entry.suprailiacSkinfold != null ? String(entry.suprailiacSkinfold) : '',
          notes: entry.notes || '',
        });
        if (entry.date) {
          const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
          if (!isNaN(d.getTime())) setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        }
        if (entry.time && typeof entry.time === 'object' && entry.time.hour != null) {
          setTime(entry.time);
        }
      }
    } catch (e) {
      console.warn('Load measurements entry failed, trying localStorage:', e);
      try {
        const saved = localStorage.getItem('healthEntries');
        if (saved) {
          const parsed = JSON.parse(saved);
          for (const dateKey of Object.keys(parsed)) {
            const arr = parsed[dateKey];
            if (Array.isArray(arr)) {
              const entry = arr.find((e) => e.id === id);
              if (entry && (entry.type === 'measurements' || !entry.type)) {
                setFormState({
                  weight: entry.weight != null ? String(entry.weight) : '',
                  neck: entry.neck != null ? String(entry.neck) : '',
                  shoulders: entry.shoulders != null ? String(entry.shoulders) : '',
                  chest: entry.chest != null ? String(entry.chest) : '',
                  waist: entry.waist != null ? String(entry.waist) : '',
                  thigh: entry.thigh != null ? String(entry.thigh) : '',
                  arm: entry.arm != null ? String(entry.arm) : '',
                  calf: entry.calf != null ? String(entry.calf) : '',
                  chestSkinfold: entry.chestSkinfold != null ? String(entry.chestSkinfold) : '',
                  abdominalSkinfold: entry.abdominalSkinfold != null ? String(entry.abdominalSkinfold) : '',
                  thighSkinfold: entry.thighSkinfold != null ? String(entry.thighSkinfold) : '',
                  tricepSkinfold: entry.tricepSkinfold != null ? String(entry.tricepSkinfold) : '',
                  subscapularSkinfold: entry.subscapularSkinfold != null ? String(entry.subscapularSkinfold) : '',
                  suprailiacSkinfold: entry.suprailiacSkinfold != null ? String(entry.suprailiacSkinfold) : '',
                  notes: entry.notes || '',
                });
                if (entry.date) {
                  const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
                  if (!isNaN(d.getTime())) setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                }
                if (entry.time && typeof entry.time === 'object' && entry.time.hour != null) {
                  setTime(entry.time);
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

  const handleSave = async () => {
    if (!formState.weight.trim()) {
      alert('Weight is required for measurements.');
      return;
    }
    const weightNum = parseFloat(formState.weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Please enter a valid weight.');
      return;
    }

    const date = selectedDate || getDateFromUrl();
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const entry = {
      id: editingId || Date.now(),
      name: 'Body Measurements',
      type: 'measurements',
      date: normalizedDate,
      time: { ...time },
      weight: weightNum,
      neck: formState.neck ? parseFloat(formState.neck) : null,
      shoulders: formState.shoulders ? parseFloat(formState.shoulders) : null,
      chest: formState.chest ? parseFloat(formState.chest) : null,
      waist: formState.waist ? parseFloat(formState.waist) : null,
      thigh: formState.thigh ? parseFloat(formState.thigh) : null,
      arm: formState.arm ? parseFloat(formState.arm) : null,
      calf: formState.calf ? parseFloat(formState.calf) : null,
      chestSkinfold: formState.chestSkinfold ? parseFloat(formState.chestSkinfold) : null,
      abdominalSkinfold: formState.abdominalSkinfold ? parseFloat(formState.abdominalSkinfold) : null,
      thighSkinfold: formState.thighSkinfold ? parseFloat(formState.thighSkinfold) : null,
      tricepSkinfold: formState.tricepSkinfold ? parseFloat(formState.tricepSkinfold) : null,
      subscapularSkinfold: formState.subscapularSkinfold ? parseFloat(formState.subscapularSkinfold) : null,
      suprailiacSkinfold: formState.suprailiacSkinfold ? parseFloat(formState.suprailiacSkinfold) : null,
      notes: formState.notes || '',
    };

    setSaving(true);
    try {
      try {
        if (!healthDB.db) await healthDB.init();
        await healthDB.saveUserEntry(entry);
      } catch (dbErr) {
        console.warn('IndexedDB save failed, using localStorage:', dbErr);
        const dateKey = normalizedDate.toDateString();
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
      }
      alert(editingId ? 'Measurements updated.' : 'Measurements added.');
      window.location.href = '/';
    } catch (err) {
      console.error('Error saving measurements:', err);
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
  const { weightUnit = 'kg', lengthUnit = 'cm' } = settings || {};

  const inputClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 pr-16';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Heading inside card, X top right */}
        <div className="px-6 sm:px-8 lg:px-10 pt-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white m-0">
              {editingId ? 'Edit Body Measurements' : 'Add Body Measurements'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-0">
              {editingId ? 'Update this measurements entry' : 'Log your body measurements'}
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

          {/* Time card - same as Add Exercise */}
          <section className="space-y-4" aria-label="Time">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time
              </label>
              <TimePicker value={time} onChange={setTime} />
            </div>
          </section>

          <div>
            <label htmlFor="weight" className={labelClass}>
              Weight <span className="text-gray-900 dark:text-gray-100 font-medium">*</span>
            </label>
            <div className="relative">
              <input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={formState.weight}
                onChange={(e) => setFormState((prev) => ({ ...prev, weight: e.target.value }))}
                className={inputClass}
                placeholder="Enter your weight"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">{weightUnit}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'neck', label: 'Neck' },
              { id: 'chest', label: 'Chest' },
              { id: 'arm', label: 'Arm' },
              { id: 'waist', label: 'Waist' },
              { id: 'thigh', label: 'Thigh' },
              { id: 'shoulders', label: 'Shoulders' },
              { id: 'calf', label: 'Calf' },
            ].map(({ id, label }) => (
              <div key={id}>
                <label htmlFor={id} className={labelClass}>{label}</label>
                <div className="relative">
                  <input
                    id={id}
                    type="number"
                    step="0.1"
                    min="0"
                    value={formState[id]}
                    onChange={(e) => setFormState((prev) => ({ ...prev, [id]: e.target.value }))}
                    className={inputClass}
                    placeholder={`${label} (${lengthUnit})`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">{lengthUnit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>Notes (Optional)</label>
            <textarea
              id="notes"
              value={formState.notes}
              onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200"
              placeholder="Add any additional notes about your measurements..."
            />
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
              disabled={saving || !formState.weight.trim()}
              className="h-12 px-6 py-0 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Measurements'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddMeasurementsFormPage = () => (
  <SettingsProvider>
    <AddMeasurementsFormPageInner />
  </SettingsProvider>
);

export default AddMeasurementsFormPage;
