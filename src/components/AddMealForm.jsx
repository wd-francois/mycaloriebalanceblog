import { useState, useEffect, useRef } from 'react';
import healthDB from '../lib/database.js';
import AutocompleteInput from './AutocompleteInput.jsx';
import TimePicker from './TimePicker.jsx';
import { useLibraryPlaceholders } from '../hooks/useLibraryPlaceholders.js';
import { getCurrentTimeParts, parseDateLocalYYYYMMDD, formatDateForDisplay } from '../lib/dateUtils.js';
import { useToast } from '../hooks/useToast.js';
import { ToastContainer } from './ui/Toast.jsx';

const initialFormData = {
  name: '',
  amount: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  fibre: '',
  other: '',
  notes: '',
};

// Helper to read a date from the URL (?date=YYYY-MM-DD) as local date, falling back to today
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

const AddMealForm = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  /** Food library row vs calendar userEntries meal (same ?edit=id URL from library vs home calendar) */
  const [editTarget, setEditTarget] = useState('food');
  const calendarEntryBaselineRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    typeof window !== 'undefined' ? getDateFromUrl() : new Date()
  );
  const [time, setTime] = useState(() => getCurrentTimeParts());
  const libPh = useLibraryPlaceholders({ enabled: typeof window !== 'undefined' });
  const { toasts, showToast } = useToast();

  const handleLibraryMealSelect = (item) => {
    if (!item) return;
    setFormData((prev) => ({
      ...prev,
      name: item.name || prev.name,
      amount: item.amount != null && String(item.amount).trim() !== '' ? String(item.amount) : prev.amount,
      calories: item.calories != null && item.calories !== '' ? String(item.calories) : prev.calories,
      protein: item.protein != null && item.protein !== '' ? String(item.protein) : prev.protein,
      carbs: item.carbs != null && item.carbs !== '' ? String(item.carbs) : prev.carbs,
      fats: item.fats != null && item.fats !== '' ? String(item.fats) : prev.fats,
      fibre: item.fibre != null && item.fibre !== '' ? String(item.fibre) : prev.fibre,
      other: item.other != null && String(item.other).trim() !== '' ? String(item.other) : prev.other,
    }));
  };

  useEffect(() => {
    setSelectedDate(getDateFromUrl());
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const editId = params.get('edit');
    if (editId) {
      const id = parseInt(editId, 10);
      if (!isNaN(id)) {
        setEditingId(id);
        setLoading(true);
        loadItem(id);
        return;
      }
    }
    setEditingId(null);
    setEditTarget('food');
    calendarEntryBaselineRef.current = null;
  }, []);

  const loadItem = async (id) => {
    try {
      if (!healthDB.db) await healthDB.init();
      const foodItem = await healthDB.getFoodItem(id);
      if (foodItem) {
        setEditTarget('food');
        calendarEntryBaselineRef.current = null;
        setFormData({
          name: foodItem.name || '',
          amount: foodItem.amount || '',
          calories: foodItem.calories ?? '',
          protein: foodItem.protein ?? '',
          carbs: foodItem.carbs ?? '',
          fats: foodItem.fats ?? '',
          fibre: foodItem.fibre ?? '',
          other: foodItem.other ?? '',
          notes: foodItem.notes || '',
        });
        setLoading(false);
        return;
      }

      const userEntry = await healthDB.getUserEntryById(id);
      if (userEntry && userEntry.type === 'meal') {
        setEditTarget('calendar');
        calendarEntryBaselineRef.current = userEntry;
        const rawDate = userEntry.date;
        if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          const [y, m, day] = rawDate.split('-').map(Number);
          setSelectedDate(new Date(y, m - 1, day));
        } else if (rawDate) {
          const dt = rawDate instanceof Date ? rawDate : new Date(rawDate);
          if (!isNaN(dt.getTime())) {
            setSelectedDate(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()));
          }
        }
        if (userEntry.time) setTime(userEntry.time);
        setFormData({
          name: userEntry.name || '',
          amount: userEntry.amount || '',
          calories: userEntry.calories ?? '',
          protein: userEntry.protein ?? '',
          carbs: userEntry.carbs ?? '',
          fats: userEntry.fats ?? '',
          fibre: userEntry.fibre ?? '',
          other: userEntry.other ?? '',
          notes: userEntry.notes || '',
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Load meal failed, using localStorage fallback:', e);
      try {
        const items = JSON.parse(localStorage.getItem('mealLibrary') || '[]');
        const item = items.find((i) => i.id === id);
        if (item) {
          setEditTarget('food');
          calendarEntryBaselineRef.current = null;
          setFormData({
            name: item.name || '',
            amount: item.amount || '',
            calories: item.calories ?? '',
            protein: item.protein ?? '',
            carbs: item.carbs ?? '',
            fats: item.fats ?? '',
            fibre: item.fibre ?? '',
            other: item.other ?? '',
            notes: item.notes || '',
          });
        }
      } catch (_) {}
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name for the item.');
      return;
    }
    setSaving(true);
    try {
      const itemData = {
        name: formData.name.trim(),
        amount: formData.amount.trim(),
        calories: formData.calories ? parseInt(formData.calories, 10) : null,
        protein: formData.protein ? parseInt(formData.protein, 10) : null,
        carbs: formData.carbs ? parseInt(formData.carbs, 10) : null,
        fats: formData.fats ? parseInt(formData.fats, 10) : null,
        fibre: formData.fibre ? parseInt(formData.fibre, 10) : null,
        other: formData.other?.trim() || '',
        notes: formData.notes || '',
      };

      try {
        if (!healthDB.db) await healthDB.init();
        if (editingId && editTarget === 'calendar' && calendarEntryBaselineRef.current) {
          const base = calendarEntryBaselineRef.current;
          const d = selectedDate || getDateFromUrl();
          const normalizedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const updatedCalendarEntry = {
            ...base,
            id: base.id,
            type: 'meal',
            name: itemData.name,
            amount: itemData.amount || '',
            calories: itemData.calories,
            protein: itemData.protein,
            carbs: itemData.carbs,
            fats: itemData.fats,
            fibre: itemData.fibre,
            other: itemData.other || '',
            notes: itemData.notes || '',
            date: normalizedDate,
            time,
          };
          await healthDB.saveUserEntry(updatedCalendarEntry);
        } else if (editingId) {
          await healthDB.updateItem('food', editingId, itemData);
        } else {
          await healthDB.addItem('food', itemData);
        }
      } catch (indexedDBError) {
        console.warn('IndexedDB save failed, using localStorage:', indexedDBError);
        if (editingId && editTarget === 'calendar' && calendarEntryBaselineRef.current) {
          const base = calendarEntryBaselineRef.current;
          const d = selectedDate || getDateFromUrl();
          const normalizedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const dateKey = normalizedDate.toDateString();
          const updatedCalendarEntry = {
            ...base,
            id: base.id,
            type: 'meal',
            name: itemData.name,
            amount: itemData.amount || '',
            calories: itemData.calories,
            protein: itemData.protein,
            carbs: itemData.carbs,
            fats: itemData.fats,
            fibre: itemData.fibre,
            other: itemData.other || '',
            notes: itemData.notes || '',
            date: normalizedDate,
            time,
          };
          const currentData = JSON.parse(localStorage.getItem('healthEntries') || '{}');
          if (!currentData[dateKey]) currentData[dateKey] = [];
          const idx = currentData[dateKey].findIndex((e) => e.id === base.id);
          if (idx >= 0) currentData[dateKey][idx] = { ...updatedCalendarEntry, date: updatedCalendarEntry.date };
          else currentData[dateKey].push({ ...updatedCalendarEntry, date: updatedCalendarEntry.date });
          localStorage.setItem('healthEntries', JSON.stringify(currentData));
        } else {
          const storageKey = 'mealLibrary';
          const currentItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
          if (editingId) {
            const updated = currentItems.map((item) =>
              item.id === editingId ? { ...item, ...itemData } : item
            );
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } else {
            const newItem = { id: Date.now(), ...itemData };
            currentItems.push(newItem);
            localStorage.setItem(storageKey, JSON.stringify(currentItems));
          }
        }
      }

      // When adding a new meal (not editing), also save as a calendar entry for the selected date/time so it appears on the calendar and in meal entries
      if (!editingId) {
        const normalizedDate = new Date((selectedDate || getDateFromUrl()).getFullYear(), (selectedDate || getDateFromUrl()).getMonth(), (selectedDate || getDateFromUrl()).getDate());
        if (!isNaN(normalizedDate.getTime())) {
          const calendarEntry = {
            id: Date.now(),
            type: 'meal',
            name: itemData.name,
            date: normalizedDate,
            time: time,
            amount: itemData.amount || '',
            calories: itemData.calories,
            protein: itemData.protein,
            carbs: itemData.carbs,
            fats: itemData.fats,
            fibre: itemData.fibre,
            other: itemData.other || '',
          };
        try {
          await healthDB.saveUserEntry(calendarEntry);
        } catch (entryErr) {
          console.warn('Calendar entry save failed, meal saved to library only:', entryErr);
          try {
            const storageKey = 'healthEntries';
            const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const dateKey = normalizedDate.toDateString();
            if (!currentData[dateKey]) currentData[dateKey] = [];
            currentData[dateKey].push(calendarEntry);
            localStorage.setItem(storageKey, JSON.stringify(currentData));
          } catch (_) {}
        }
        }
      }

      showToast(editingId ? 'Meal updated!' : 'Meal added!', 'success');
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } catch (error) {
      console.error('Error saving item:', error);
      showToast('Error saving meal. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/';
  };

  // Always show header with date (same pattern as Add Sleep / Add Measurements / Add Exercise)
  const date = selectedDate || getDateFromUrl();
  const dateString = date ? formatDateForDisplay(date, 'DD/MM/YYYY') : formatDateForDisplay(new Date(), 'DD/MM/YYYY');

  return (
    <div className="w-full max-w-2xl mx-auto">
      <ToastContainer toasts={toasts} />
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Heading inside card, X top right */}
        <div className="px-6 sm:px-8 lg:px-10 pt-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white m-0">
              {editingId ? 'Edit Meal' : 'Add Meal'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-0">
              {editingId ? 'Update this item in your Food Library' : 'Save a new item to your Food Library'}
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
          {loading && editingId ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400" />
              <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-300">Loading meal...</span>
            </div>
          ) : (
          <>
          <section className="space-y-4" aria-label="Date">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </label>
              <p className="text-base text-gray-900 dark:text-white font-medium">{dateString}</p>
            </div>
          </section>

          <section className="space-y-4" aria-label="Time">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time
              </label>
              <TimePicker value={time} onChange={(newTime) => setTime(newTime)} />
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Basic Information Section */}
          <section className="space-y-6">
            <div className="pb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Basic Information</h2>
              <p className="text-sm font-normal text-gray-500 dark:text-gray-400">Essential details about your meal</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Name <span className="text-gray-700 dark:text-gray-300 font-medium">*</span>
                </label>
                <AutocompleteInput
                  type="food"
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: v })}
                  onSelect={handleLibraryMealSelect}
                  placeholder={libPh.mealNamePlaceholder}
                  autoFocus
                  className="min-h-12 rounded-xl border-gray-200 dark:border-gray-700 py-3 text-base focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="text"
                  list="add-meal-amount-datalist"
                  autoComplete="off"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealAmountPlaceholder}
                />
                <datalist id="add-meal-amount-datalist">
                  {libPh.mealAmountOptions.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Nutrition Information Section */}
          <section className="space-y-6">
            <div className="pb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Nutrition Information</h2>
              <p className="text-sm font-normal text-gray-500 dark:text-gray-400">Macronutrients and calories (optional)</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Calories
                </label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealCaloriesPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={formData.protein}
                  onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealProteinPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealCarbsPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fats (g)
                </label>
                <input
                  type="number"
                  value={formData.fats}
                  onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealFatsPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fibre (g)
                </label>
                <input
                  type="number"
                  value={formData.fibre}
                  onChange={(e) => setFormData({ ...formData, fibre: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealFibrePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Other
                </label>
                <input
                  type="text"
                  value={formData.other}
                  onChange={(e) => setFormData({ ...formData, other: e.target.value })}
                  className="w-full h-12 px-4 py-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all"
                  placeholder={libPh.mealOtherPlaceholder}
                />
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Additional Information Section */}
          <section className="space-y-6">
            <div className="pb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Additional Information</h2>
              <p className="text-sm font-normal text-gray-500 dark:text-gray-400">Extra notes and details</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full min-h-[96px] px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[var(--color-bg-subtle)] text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:border-gray-500 transition-all resize-none"
                placeholder="Add any notes about this meal..."
                rows={4}
              />
            </div>
          </section>
          </>
          )}
        </div>

        {/* Action Buttons - evenly spaced, especially on mobile */}
        <div className="px-6 sm:px-8 lg:px-10 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 relative z-10">
          <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleCancel(); }}
              className="h-12 px-3 sm:px-6 py-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors min-w-0"
            >
              Cancel
            </button>
            <a
              href="/library"
              className="inline-flex items-center justify-center h-12 px-3 sm:px-6 py-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors border border-gray-300 dark:border-gray-600 no-underline min-w-0"
            >
              Library
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!formData.name.trim()) {
                  alert('Please enter a name for the item.');
                  return;
                }
                if (saving) return;
                handleSave();
              }}
              disabled={saving}
              className="h-12 px-3 sm:px-6 py-0 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
            >
              {saving ? 'Saving...' : editingId ? 'Update Meal' : 'Add Meal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMealForm;
