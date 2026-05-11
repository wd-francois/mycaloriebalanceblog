import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AddEntryModal from './AddEntryModal';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const TYPE_META = {
  meal: { label: 'Meal', icon: '🍽️', accent: 'bg-orange-100 text-orange-700' },
  exercise: { label: 'Exercise', icon: '🏋️', accent: 'bg-blue-100 text-blue-700' },
  activity: { label: 'Activity', icon: '🚶', accent: 'bg-green-100 text-green-700' },
  sleep: { label: 'Sleep', icon: '😴', accent: 'bg-purple-100 text-purple-700' },
  measurements: { label: 'Weight', icon: '⚖️', accent: 'bg-pink-100 text-pink-700' },
};

function MacroRing({ value, goal, color, label }) {
  const pct = goal ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle
            cx="28" cy="28" r="22" fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
          {value}
        </span>
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      {goal && <span className="text-[10px] text-gray-400">/{goal}</span>}
    </div>
  );
}

function EntryCard({ entry, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const removeEntry = useMutation(api.entries.remove);
  const meta = TYPE_META[entry.type] || TYPE_META.meal;

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return;
    setDeleting(true);
    try {
      await removeEntry({ id: entry._id });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <span className="text-2xl">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.accent}`}>{meta.label}</span>
          <span className="font-semibold text-gray-900 text-sm truncate">{entry.name || meta.label}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
          {entry.calories && <span>🔥 {entry.calories} kcal</span>}
          {entry.protein && <span>💪 {entry.protein}g protein</span>}
          {entry.durationMinutes && <span>⏱ {entry.durationMinutes} min</span>}
          {entry.distance && <span>📍 {entry.distance} km</span>}
          {entry.steps && <span>👟 {Number(entry.steps).toLocaleString()} steps</span>}
          {entry.sleepDuration && <span>💤 {entry.sleepDuration}h</span>}
          {entry.weight && <span>⚖️ {entry.weight} {entry.weightUnit || 'kg'}</span>}
        </div>
        {entry.notes && <p className="mt-1 text-xs text-gray-400 line-clamp-1">{entry.notes}</p>}
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export default function ProHome({ settings }) {
  const today = todayISO();
  const [showAdd, setShowAdd] = useState(false);

  const entries = useQuery(api.entries.list, { date: today }) ?? [];

  const meals = entries.filter((e) => e.type === 'meal');
  const totalCals = meals.reduce((s, e) => s + (e.calories || 0), 0);
  const totalProtein = meals.reduce((s, e) => s + (e.protein || 0), 0);
  const totalCarbs = meals.reduce((s, e) => s + (e.carbs || 0), 0);
  const totalFat = meals.reduce((s, e) => s + (e.fat || 0), 0);
  const calorieGoal = settings?.calorieGoal;

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Date header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{formatDate(today)}</h2>
          <p className="text-sm text-gray-500">Today's log</p>
        </div>

        {/* Calorie summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Calories</p>
              <p className="text-3xl font-bold text-gray-900">{totalCals.toLocaleString()}</p>
              {calorieGoal && (
                <p className="text-xs text-gray-400">of {calorieGoal.toLocaleString()} goal</p>
              )}
            </div>
            <div className="flex gap-4">
              <MacroRing value={Math.round(totalProtein)} goal={settings?.proteinGoal} color="#3b82f6" label="Protein" />
              <MacroRing value={Math.round(totalCarbs)} goal={null} color="#f59e0b" label="Carbs" />
              <MacroRing value={Math.round(totalFat)} goal={null} color="#ec4899" label="Fat" />
            </div>
          </div>

          {calorieGoal && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                style={{ width: `${Math.min((totalCals / calorieGoal) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Today's entries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Today's entries</h3>
            <span className="text-xs text-gray-400">{entries.length} logged</span>
          </div>

          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm text-gray-500">Nothing logged yet today.</p>
              <p className="text-xs text-gray-400 mt-1">Tap + to add your first entry.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <EntryCard key={entry._id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 sm:right-8 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40"
        aria-label="Add entry"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} defaultDate={today} />}
    </div>
  );
}
