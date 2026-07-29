import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

// ── Entry row (view existing entries) ─────────────────────────────────────────
const ENTRY_TYPE_COLOR = {
  meal:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  exercise:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  activity:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  sleep:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  measurements: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

// ── Pill badge (module scope — stable reference, no remount) ──────────────────
function Pill({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
      {children}
    </span>
  );
}

const SLEEP_Q_COLOR = { Poor: 'text-red-500', Fair: 'text-yellow-500', Good: 'text-green-500', Excellent: 'text-blue-500' };

// ── Coach comments fetcher — isolated so a query error doesn't crash the modal ─
function CoachFeedbackSection({ entryId }) {
  const self     = useQuery(api.users.viewer);
  const comments = useQuery(
    api.comments.listForClient,
    self?._id ? { targetUserId: self._id } : 'skip'
  ) ?? [];
  const entryComments = comments.filter(c => c.entryId === entryId);
  if (entryComments.length === 0) return null;
  return (
    <div className="border-t border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 px-4 py-2 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">Coach feedback</p>
      {entryComments.map(c => (
        <p key={c._id} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{c.text}</p>
      ))}
    </div>
  );
}

// ── Entry card (used in View Entries screen) ───────────────────────────────────
export default function EntryCard({ entry, weightUnit: wUnit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(entry._id); } finally { setDeleting(false); }
  };

  const weightUnit = entry.weightUnit ?? wUnit ?? 'kg';
  const lengthUnit = weightUnit === 'kg' ? 'cm' : 'in';

  let body = null;

  if (entry.type === 'meal') {
    const pills = [
      entry.calories != null && `🔥 ${entry.calories} kcal`,
      entry.protein  != null && `🥩 ${entry.protein}g protein`,
      entry.carbs    != null && `🍞 ${entry.carbs}g carbs`,
      entry.fat      != null && `🥑 ${entry.fat}g fats`,
      entry.fibre    != null && `🌾 ${entry.fibre}g fibre`,
    ].filter(Boolean);
    body = (
      <div className="mt-1 flex flex-col gap-1">
        {entry.amount && <p className="text-xs text-gray-500 dark:text-gray-400">{entry.amount}</p>}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pills.map(p => <Pill key={p}>{p}</Pill>)}
          </div>
        )}
        {entry.other && <p className="text-xs text-gray-500 dark:text-gray-400">📝 {entry.other}</p>}
      </div>
    );
  } else if (entry.type === 'exercise') {
    let sets = [];
    if (entry.exercisesData) { try { sets = JSON.parse(entry.exercisesData); } catch {} }
    body = (sets.length > 0 || entry.durationMinutes) ? (
      <div className="mt-1 flex flex-col gap-0.5">
        {sets.map((s, i) => (
          <p key={i} className="text-xs text-gray-500 dark:text-gray-400">
            Set {i + 1}: {[s.load && s.load, s.reps && `${s.reps} reps`].filter(Boolean).join(' · ')}
          </p>
        ))}
        {entry.durationMinutes && <p className="text-xs text-gray-500 dark:text-gray-400">⏱ {entry.durationMinutes} min</p>}
      </div>
    ) : null;
  } else if (entry.type === 'activity') {
    const pills = [
      entry.durationMinutes && `⏱ ${entry.durationMinutes} min`,
      entry.distance        && `📍 ${entry.distance}`,
      entry.steps           && `👟 ${entry.steps} steps`,
    ].filter(Boolean);
    body = pills.length > 0 ? (
      <div className="mt-1 flex flex-wrap gap-1">
        {pills.map(p => <Pill key={p}>{p}</Pill>)}
      </div>
    ) : null;
  } else if (entry.type === 'sleep') {
    const fmt = (t) => t ? `${t.hour}:${String(t.minute).padStart(2, '0')} ${t.period}` : '—';
    body = (
      <div className="mt-1 flex flex-col gap-1">
        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
          {fmt(entry.bedtime)} → {fmt(entry.waketime)}
          {entry.sleepDuration != null && (
            <span className="text-gray-500 dark:text-gray-400 font-normal"> · {entry.sleepDuration.toFixed(1)}h</span>
          )}
        </p>
        {entry.sleepQuality && (
          <span className={`text-xs font-semibold ${SLEEP_Q_COLOR[entry.sleepQuality] ?? 'text-gray-500'}`}>
            {entry.sleepQuality}
          </span>
        )}
      </div>
    );
  } else if (entry.type === 'measurements') {
    const girths = [
      ['Neck', entry.neck], ['Shoulders', entry.shoulders], ['Chest', entry.chest],
      ['Waist', entry.waist], ['Hips', entry.hips], ['Thigh', entry.thigh],
      ['Arm', entry.arm], ['Calf', entry.calf],
    ].filter(([, v]) => v != null);
    const skinfolds = [
      ['Chest', entry.chestSkinfold], ['Abdomen', entry.abdominalSkinfold],
      ['Thigh', entry.thighSkinfold], ['Tricep', entry.tricepSkinfold],
      ['Subscap.', entry.subscapularSkinfold], ['Suprailiac', entry.suprailiacSkinfold],
    ].filter(([, v]) => v != null);
    body = (
      <div className="mt-1 flex flex-col gap-1.5">
        {entry.weight != null && (
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{entry.weight} {weightUnit}</p>
        )}
        {girths.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {girths.map(([lbl, val]) => <Pill key={lbl}>{lbl}: {val} {lengthUnit}</Pill>)}
          </div>
        )}
        {skinfolds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skinfolds.map(([lbl, val]) => <Pill key={lbl}>{lbl}: {val}mm</Pill>)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden group">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 ${ENTRY_TYPE_COLOR[entry.type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
          {entry.type === 'measurements' ? 'Measure' : entry.type}
        </span>
        <div className="flex-1 min-w-0">
          {entry.name && entry.type !== 'measurements' && (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.name}</p>
          )}
          {body}
          {entry.notes && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">"{entry.notes}"</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete entry"
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-30"
        >
          {deleting
            ? <div className="w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          }
        </button>
      </div>
      <CoachFeedbackSection entryId={entry._id} />
    </div>
  );
}
