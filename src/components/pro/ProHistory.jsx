import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = todayStr();
  const yesterday = addDays(today, -1);
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const TYPE_META = {
  meal:         { emoji: '🍽',  color: 'text-orange-500 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/20'  },
  exercise:     { emoji: '💪',  color: 'text-blue-500 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-900/20'      },
  activity:     { emoji: '🏃',  color: 'text-green-500 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-900/20'    },
  sleep:        { emoji: '😴',  color: 'text-purple-500 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-900/20'  },
  measurements: { emoji: '⚖️', color: 'text-teal-500 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-900/20'      },
};

function entrySummary(entry) {
  if (entry.type === 'meal') {
    const p = [];
    if (entry.calories) p.push(`${entry.calories} kcal`);
    if (entry.protein)  p.push(`${entry.protein}g P`);
    if (entry.carbs)    p.push(`${entry.carbs}g C`);
    if (entry.fat)      p.push(`${entry.fat}g F`);
    return p.join(' · ') || null;
  }
  if (entry.type === 'activity') {
    const p = [];
    if (entry.durationMinutes) p.push(`${entry.durationMinutes} min`);
    if (entry.distance)        p.push(entry.distance);
    if (entry.steps)           p.push(`${entry.steps} steps`);
    return p.join(' · ') || null;
  }
  if (entry.type === 'exercise') {
    return entry.durationMinutes ? `${entry.durationMinutes} min` : null;
  }
  if (entry.type === 'sleep') {
    const p = [];
    if (entry.sleepDuration) p.push(`${entry.sleepDuration.toFixed(1)}h`);
    if (entry.sleepQuality)  p.push(entry.sleepQuality);
    return p.join(' · ') || null;
  }
  if (entry.type === 'measurements') {
    return entry.weight ? `${entry.weight} ${entry.weightUnit ?? 'kg'}` : null;
  }
  return null;
}

function DaySummary({ entries }) {
  const totalCal = entries
    .filter(e => e.type === 'meal')
    .reduce((s, e) => s + (e.calories ?? 0), 0);
  const hasActivity = entries.some(e => e.type === 'activity' || e.type === 'exercise');
  const sleep = entries.find(e => e.type === 'sleep');

  if (!totalCal && !hasActivity && !sleep) return null;
  return (
    <div className="flex gap-3 mt-1 mb-3 flex-wrap">
      {totalCal > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
          🍽 {totalCal} kcal
        </span>
      )}
      {hasActivity && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
          💪 Active
        </span>
      )}
      {sleep && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
          😴 {sleep.sleepDuration?.toFixed(1)}h
        </span>
      )}
    </div>
  );
}

export default function ProHistory({ initialDate }) {
  const [date, setDate] = useState(initialDate ?? todayStr());
  const entries = useQuery(api.entries.list, { date }) ?? [];
  const removeEntry = useMutation(api.entries.remove);

  const isToday = date === todayStr();

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header + date nav */}
      <div className="pt-4 px-1 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">History</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => setDate(todayStr())}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isToday
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {isToday ? 'Today' : formatDate(date)}
          </button>
          <button
            onClick={() => setDate(addDays(date, 1))}
            disabled={isToday}
            className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date label */}
      {!isToday && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 px-1">
          {formatDate(date)}
        </p>
      )}

      {/* Summary chips */}
      <DaySummary entries={entries} />

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🗓</p>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400">No entries for this day</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(entry => {
            const meta = TYPE_META[entry.type] ?? TYPE_META.meal;
            const summary = entrySummary(entry);
            return (
              <div
                key={entry._id}
                className={`flex items-start gap-3 p-3 rounded-xl ${meta.bg}`}
              >
                <span className="text-xl leading-none mt-0.5 select-none">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {entry.name || entry.type}
                  </p>
                  {summary && (
                    <p className={`text-xs mt-0.5 ${meta.color}`}>{summary}</p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{entry.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => removeEntry({ id: entry._id })}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
