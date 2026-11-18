import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useConvexSettings } from '../../../contexts/ConvexSettingsContext';
import { openAINutritionLookup, AIIcon } from './aiLookup';
import { normaliseExerciseName, parseLoad, parseReps, formatWeight, summariseSets } from './exerciseUtils';

const ACTION_BTN = 'flex-shrink-0 p-1.5 rounded-lg text-gray-400 transition-colors disabled:opacity-30';

// Types with an edit form. Legacy 'activity' entries have no form, so they
// can only be deleted.
export const EDITABLE_TYPES = ['meal', 'exercise', 'sleep', 'measurements'];

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

// ── Comment input for the client's own workout entries ────────────────────────
// Also used by WorkoutComments for the day-level final comment.
export function ClientCommentInput({ onSubmit, placeholder = 'Add a note for your coach…', autoFocus = false }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (err) {
      setError(err.message ?? 'Failed to post comment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus={autoFocus}
          value={text}
          onChange={e => { setText(e.target.value); setError(''); }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-0 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!text.trim() || saving}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {saving ? '…' : 'Post'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </form>
  );
}

// ── Comment thread rows (shared by the exercise card footer and other cards) ──
function CommentList({ comments, selfId, onDelete }) {
  return comments.map(c => {
    const mine = c.authorId === selfId;
    return (
      <div key={c._id} className="flex items-start gap-2 group">
        <span className={`text-xs font-medium flex-shrink-0 mt-px w-11 ${mine ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
          {mine ? 'You' : 'Coach'}
        </span>
        <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.text}</p>
        {mine && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(c._id)}
            title="Delete comment"
            aria-label="Delete comment"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-sm text-red-400 hover:text-red-600 transition-all flex-shrink-0 px-1"
          >
            ×
          </button>
        )}
      </div>
    );
  });
}

// ── Coach feedback on non-workout entries — isolated so a query error doesn't
//    crash the modal ───────────────────────────────────────────────────────────
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
      <p className="text-[10px] font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide">Coach feedback</p>
      <CommentList comments={entryComments} selfId={self?._id} />
    </div>
  );
}

// ── Exercise card: collapsible note row at the bottom ─────────────────────────
// Collapsed it reads "Add a note for your coach", or "N comments" once there
// is a thread. Tapping expands the comments and the inline input.
function ExerciseNoteRow({ entry }) {
  const self       = useQuery(api.users.viewer);
  const comments   = useQuery(
    api.comments.listForClient,
    self?._id ? { targetUserId: self._id } : 'skip'
  ) ?? [];
  const addComment = useMutation(api.comments.add);
  const delComment = useMutation(api.comments.remove);
  const [open, setOpen] = useState(false);

  const entryComments = comments.filter(c => c.entryId === entry._id);
  const n = entryComments.length;
  const allFromCoach = n > 0 && entryComments.every(c => c.authorId !== self?._id);
  const label = n === 0
    ? 'Add a note for your coach'
    : `${n} comment${n !== 1 ? 's' : ''}${allFromCoach ? ' from your coach' : ''}`;

  return (
    <div className="mt-4 -mx-4 -mb-4 border-t border-gray-100 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors rounded-b-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
          n > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m-9 7V6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H8l-4 4z" />
        </svg>
        {label}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {n > 0 && (
            <div className="flex flex-col gap-1.5 pb-1">
              <CommentList comments={entryComments} selfId={self?._id} onDelete={id => delComment({ id })} />
            </div>
          )}
          {self?._id && (
            <ClientCommentInput
              autoFocus
              onSubmit={text => addComment({ targetUserId: self._id, entryId: entry._id, date: entry.date, text })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Photo thumbnail + lightbox (shared by both card layouts) ──────────────────
function EntryPhoto({ photo, alt, onDeletePhoto, className = '' }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  if (!photo?.url) return null;
  return (
    <>
      <div className={`relative ${className}`}>
        <button type="button" onClick={() => setPhotoOpen(true)} className="block w-full" aria-label="View photo">
          <img
            src={photo.url}
            alt={alt}
            className="w-full max-h-48 rounded-xl object-cover border border-gray-100 dark:border-gray-800"
          />
        </button>
        {onDeletePhoto && (
          <button
            type="button"
            onClick={() => onDeletePhoto(photo._id)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
            aria-label="Delete photo"
            title="Delete photo"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      {photoOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPhotoOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPhotoOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={photo.url}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── Exercise card ─────────────────────────────────────────────────────────────
// Header (icon, name, ⋯ menu), summary chips, a Set | Weight | Reps table and
// the collapsible note row. Edit and delete live in the overflow menu.
function ExerciseEntryCard({ entry, photo, weightUnit, onDelete, onEdit, onDeletePhoto }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const esc   = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

  let sets = [];
  if (entry.exercisesData) { try { sets = JSON.parse(entry.exercisesData); } catch {} }
  if (!Array.isArray(sets)) sets = [];
  const summary = summariseSets(sets, weightUnit);
  const name = normaliseExerciseName(entry.name) || 'Exercise';

  const chips = [
    entry.muscleGroup && entry.muscleGroup[0].toUpperCase() + entry.muscleGroup.slice(1),
    sets.length > 0 && `${summary.sets} set${summary.sets !== 1 ? 's' : ''}`,
    sets.length > 0 && (summary.isBodyweight
      ? `${summary.totalReps.toLocaleString()} reps`
      : `${summary.volume.toLocaleString()} ${summary.unit} volume`),
    entry.durationMinutes && `${entry.durationMinutes} min`,
  ].filter(Boolean);

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete(entry._id); } finally { setDeleting(false); }
  };

  return (
    <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-snug">{name}</p>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {chips.map(c => <Pill key={c}>{c}</Pill>)}
            </div>
          )}
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            disabled={deleting}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More actions"
            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {deleting
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
              : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="19" cy="12" r="1.75" />
                </svg>
            }
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-1 w-36 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-muted)] shadow-lg py-1 z-20">
              {onEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onEdit(entry); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sets table */}
      {sets.length > 0 && (
        <table className="w-full mt-3 text-sm">
          <thead>
            <tr className="text-xs text-gray-400 dark:text-gray-500">
              <th scope="col" className="font-normal text-left pb-2 w-12">Set</th>
              <th scope="col" className="font-normal text-left pb-2">Weight</th>
              <th scope="col" className="font-normal text-left pb-2">Reps</th>
              <th scope="col" className="pb-2 w-8"><span className="sr-only">Status</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sets.map((s, i) => {
              const load = parseLoad(s.load, weightUnit);
              const reps = parseReps(s.reps);
              const logged = reps != null || load.kind === 'weight';
              return (
                <tr key={i}>
                  <td className="py-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center tabular-nums">
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2 text-gray-900 dark:text-gray-100 tabular-nums">
                    {load.kind === 'weight'
                      ? formatWeight(load.value, load.unit)
                      : load.kind === 'bodyweight'
                        ? <span className="text-gray-500 dark:text-gray-400">Bodyweight</span>
                        : load.text}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-gray-100 tabular-nums">
                    {reps ?? (s.reps || <span className="text-gray-400">—</span>)}
                  </td>
                  <td className="py-2 text-right">
                    {logged && (
                      <svg className="w-4 h-4 inline-block text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-label="Logged">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {entry.notes && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{entry.notes}</p>
      )}

      <EntryPhoto photo={photo} alt={photo?.caption ?? name} onDeletePhoto={onDeletePhoto} className="mt-3" />

      <ExerciseNoteRow entry={entry} />
    </div>
  );
}

// ── Entry card (used in View Entries screen) ───────────────────────────────────
export default function EntryCard({ entry, photo, weightUnit: wUnit, onDelete, onEdit, onDeletePhoto }) {
  const [deleting, setDeleting] = useState(false);
  const aiSettings = useConvexSettings();
  const isMeal = entry.type === 'meal';

  const weightUnit = entry.weightUnit ?? wUnit ?? 'kg';
  const lengthUnit = weightUnit === 'kg' ? 'cm' : 'in';

  if (entry.type === 'exercise') {
    return (
      <ExerciseEntryCard
        entry={entry}
        photo={photo}
        weightUnit={wUnit ?? 'kg'}
        onDelete={onDelete}
        onEdit={onEdit}
        onDeletePhoto={onDeletePhoto}
      />
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(entry._id); } finally { setDeleting(false); }
  };

  let body = null;

  if (entry.type === 'meal') {
    const pills = [
      entry.calories != null && `🔥 ${entry.calories} kcal`,
      entry.protein  != null && `🥩 ${entry.protein}g protein`,
      entry.carbs    != null && `🍞 ${entry.carbs}g carbs`,
      entry.fat      != null && `🥑 ${entry.fat}g fats`,
      entry.fibre    != null && `🌾 ${entry.fibre}g fibre`,
      entry.sodium   != null && `🧂 ${entry.sodium}mg sodium`,
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
          <EntryPhoto photo={photo} alt={photo?.caption ?? entry.name ?? 'Entry photo'} onDeletePhoto={onDeletePhoto} className="mt-2" />
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1.5 -mt-0.5">
          {isMeal && (
            <button
              type="button"
              onClick={() => openAINutritionLookup(aiSettings, entry)}
              title="Get AI nutrition info"
              aria-label="Get AI nutrition info"
              className={`${ACTION_BTN} hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20`}
            >
              <AIIcon />
            </button>
          )}
          {onEdit && EDITABLE_TYPES.includes(entry.type) && (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              title="Edit entry"
              aria-label="Edit entry"
              className={`${ACTION_BTN} hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete entry"
            aria-label="Delete entry"
            className={`${ACTION_BTN} hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
          >
            {deleting
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            }
          </button>
        </div>
      </div>
      <CoachFeedbackSection entryId={entry._id} />
    </div>
  );
}
