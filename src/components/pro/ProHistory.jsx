import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AddEntryModal from './AddEntryModal';

function weekAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yISO = yesterday.toISOString().slice(0, 10);

  if (iso === today) return 'Today';
  if (iso === yISO) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const TYPE_META = {
  meal: { icon: '🍽️', accent: 'bg-orange-50 text-orange-600 border-orange-100' },
  exercise: { icon: '🏋️', accent: 'bg-blue-50 text-blue-600 border-blue-100' },
  activity: { icon: '🚶', accent: 'bg-green-50 text-green-600 border-green-100' },
  sleep: { icon: '😴', accent: 'bg-purple-50 text-purple-600 border-purple-100' },
  measurements: { icon: '⚖️', accent: 'bg-pink-50 text-pink-600 border-pink-100' },
};

function EntryRow({ entry }) {
  const [deleting, setDeleting] = useState(false);
  const removeEntry = useMutation(api.entries.remove);
  const meta = TYPE_META[entry.type] || TYPE_META.meal;

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return;
    setDeleting(true);
    try { await removeEntry({ id: entry._id }); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <span className={`text-sm px-2 py-1 rounded-lg border font-medium flex-shrink-0 ${meta.accent}`}>
        {meta.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{entry.name || entry.type}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
          {entry.calories && <span>🔥 {entry.calories} kcal</span>}
          {entry.protein && <span>💪 {entry.protein}g</span>}
          {entry.durationMinutes && <span>⏱ {entry.durationMinutes} min</span>}
          {entry.sleepDuration && <span>💤 {entry.sleepDuration}h</span>}
          {entry.weight && <span>⚖️ {entry.weight}{entry.weightUnit}</span>}
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0 p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export default function ProHistory() {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [search, setSearch] = useState('');

  const entries = useQuery(api.entries.listByDateRange, {
    startDate: weekAgoISO(),
    endDate: todayISO(),
  }) ?? [];

  const filtered = entries.filter((e) =>
    !search || (e.name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by date
  const byDate = filtered.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">History</h2>
          <p className="text-sm text-gray-500">Last 30 days</p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {dates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-gray-500">No entries in the last 30 days.</p>
          </div>
        ) : (
          dates.map((date) => (
            <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Date header */}
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-900 text-sm">{formatDate(date)}</span>
                  <span className="text-xs text-gray-400 ml-2">{byDate[date].length} entries</span>
                </div>
                <span className="text-xs text-gray-400">
                  {byDate[date].filter((e) => e.type === 'meal').reduce((s, e) => s + (e.calories || 0), 0)} kcal
                </span>
              </div>

              {/* Entries */}
              <div className="px-4 divide-y divide-gray-50">
                {byDate[date].map((entry) => (
                  <EntryRow key={entry._id} entry={entry} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 sm:right-8 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
