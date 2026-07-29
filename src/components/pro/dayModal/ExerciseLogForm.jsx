import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import ExercisePickerModal from '../ExercisePickerModal';
import { getCurrentTimeParts } from '../../../lib/dateUtils';
import { LABEL, INPUT, SET_INPUT } from './styles';

// ── Exercise builder (shared card, matches ProPrograms) ───────────────────────
export const emptyExercise = () => ({
  id: Date.now() + Math.random(),
  name: '', load: '', reps: '', extraSets: [], notes: '', videoUrls: [], expanded: true,
});

export function normaliseEx(e) {
  let result;
  if (e.extraSets !== undefined || e.load !== undefined) {
    result = !e.videoUrls ? { ...e, videoUrls: e.videoUrl ? [e.videoUrl] : [] } : e;
  } else {
    const count = Math.max(1, parseInt(e.sets) || 1);
    const load  = e.weight || '';
    const reps  = e.reps   || '';
    result = { ...emptyExercise(), name: e.name || '', load, reps, notes: e.notes || '',
      videoUrls: e.videoUrl ? [e.videoUrl] : [],
      extraSets: Array.from({ length: count - 1 }, () => ({ load, reps })) };
  }
  // Migrate any URLs left in notes into videoUrls, then strip them from notes
  const urlsInNotes = (result.notes ?? '').match(/https?:\/\/\S+/g) ?? [];
  if (urlsInNotes.length > 0) {
    const existing = new Set(result.videoUrls ?? []);
    const newUrls  = urlsInNotes.filter(u => !existing.has(u));
    result = {
      ...result,
      videoUrls: [...(result.videoUrls ?? []), ...newUrls],
      notes: (result.notes ?? '').replace(/https?:\/\/\S+/g, '').trim(),
    };
  }
  return result;
}

function ExerciseCard({ ex, index, onChange, onRemove }) {
  const [showPicker, setShowPicker] = useState(false);
  const totalSets = 1 + (ex.extraSets?.length ?? 0);
  const done = !!(ex.name && (ex.reps || ex.load));

  // Also surface URLs typed into the notes field (backward compat for programs saved before Media Links)
  const notesVideoUrls = ((ex.notes ?? '').match(/https?:\/\/\S+/g) ?? []).filter(u => !u.endsWith('.gif'));
  const videoLinks = [
    ...(ex.videoUrls ?? []).filter(u => u && !u.endsWith('.gif')),
    ...notesVideoUrls.filter(u => !(ex.videoUrls ?? []).includes(u)),
  ];

  const addSet = () => {
    const last = ex.extraSets?.length > 0 ? ex.extraSets[ex.extraSets.length - 1] : { load: ex.load, reps: ex.reps };
    onChange({ ...ex, extraSets: [...(ex.extraSets ?? []), { load: last.load || '', reps: last.reps || '' }] });
  };

  const removeSet = (row) => {
    if (row === 0) {
      if (!ex.extraSets?.length) return;
      const [first, ...rest] = ex.extraSets;
      onChange({ ...ex, load: first.load ?? '', reps: first.reps ?? '', extraSets: rest });
    } else {
      onChange({ ...ex, extraSets: ex.extraSets.filter((_, i) => i !== row - 1) });
    }
  };

  const syncExtras = (field, val) =>
    (ex.extraSets ?? []).map(s => (!s[field] && val) ? { ...s, [field]: val } : s);

  return (
    <div className={`rounded-xl border transition-all ${done ? 'border-blue-500/30' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-[var(--color-bg-muted)]`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => onChange({ ...ex, expanded: !ex.expanded })}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
          {done
            ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : index + 1}
        </div>
        <span className={`flex-1 text-sm font-semibold truncate min-w-0 ${ex.name ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          {ex.name || 'New exercise'}
        </span>
        <span className="text-xs text-gray-400 shrink-0 mr-1 hidden sm:block">
          {totalSets} set{totalSets !== 1 ? 's' : ''}{done && (ex.load || ex.reps) ? ` · ${ex.load || '—'} · ${ex.reps || '—'} reps` : ''}
        </span>
        {videoLinks.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="Added Video"
            className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </a>
        ))}
        <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${ex.expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {ex.expanded && (
        <div className="px-3.5 pb-3.5 border-t border-gray-200 dark:border-gray-600/50 pt-3 flex flex-col gap-4">
          {showPicker && (
            <ExercisePickerModal
              onSelect={({ name, gifUrl }) => {
                const videoUrls = gifUrl
                  ? [gifUrl, ...(ex.videoUrls ?? []).filter(u => !u.endsWith('.gif'))]
                  : (ex.videoUrls ?? []);
                onChange({ ...ex, name, videoUrls });
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          )}
          {/* Name */}
          <div>
            <label className={LABEL}>Exercise</label>
            <div className="flex gap-2">
              <input className={INPUT} value={ex.name} placeholder="e.g. Bench Press"
                onChange={e => onChange({ ...ex, name: e.target.value })} />
              <button type="button" onClick={() => setShowPicker(true)} title="Browse exercise database"
                className="flex-shrink-0 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.657-4.03 3-9 3s-9-1.343-9-3" />
                  <path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
                </svg>
              </button>
            </div>
          </div>

          {/* GIF preview */}
          {(ex.videoUrls ?? []).find(u => u.endsWith('.gif')) && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <img src={(ex.videoUrls ?? []).find(u => u.endsWith('.gif'))} alt={ex.name} className="w-full max-h-52 object-contain" />
            </div>
          )}

          {/* Coach video links */}
          {videoLinks.map((url, i, arr) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className="text-xs font-semibold truncate">
                Added Video{arr.length > 1 ? ` ${i + 1}` : ''}
              </span>
            </a>
          ))}

          {/* Sets table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-white/[0.04] p-3 flex flex-col gap-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 pb-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase text-center">Set</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Load</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Reps</span>
              <span />
            </div>
            {/* Row 1 */}
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center tabular-nums">1</span>
              <input className={SET_INPUT} value={ex.load} placeholder="—"
                onChange={e => onChange({ ...ex, load: e.target.value, extraSets: syncExtras('load', e.target.value) })} />
              <input className={SET_INPUT} value={ex.reps} placeholder="—"
                onChange={e => onChange({ ...ex, reps: e.target.value, extraSets: syncExtras('reps', e.target.value) })} />
              <div className="flex justify-center">
                {totalSets > 1 && (
                  <button type="button" onClick={() => removeSet(0)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            {/* Extra rows */}
            {(ex.extraSets ?? []).map((s, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center tabular-nums">{i + 2}</span>
                <input className={SET_INPUT} value={s.load || ''} placeholder="—"
                  onChange={e => onChange({ ...ex, extraSets: ex.extraSets.map((x, j) => j === i ? { ...x, load: e.target.value } : x) })} />
                <input className={SET_INPUT} value={s.reps || ''} placeholder="—"
                  onChange={e => onChange({ ...ex, extraSets: ex.extraSets.map((x, j) => j === i ? { ...x, reps: e.target.value } : x) })} />
                <div className="flex justify-center">
                  <button type="button" onClick={() => removeSet(i + 1)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {/* Add Set */}
            <div className="flex justify-center pt-1">
              <button type="button" onClick={addSet}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Set
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes</label>
            <textarea rows={2} className={INPUT + ' resize-none'} value={ex.notes} placeholder="Additional notes..."
              onChange={e => onChange({ ...ex, notes: e.target.value })} />
          </div>

        </div>
      )}
    </div>
  );
}

// ── Coach Program Picker ───────────────────────────────────────────────────────
function CoachProgramPicker({ onSelect, onClose }) {
  const programs = useQuery(api.programs.getMyPrograms) ?? [];
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Load Coach Program</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {programs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              No programs assigned yet.<br />Ask your coach to assign one.
            </p>
          ) : programs.map(p => {
            let exercises = [];
            try { exercises = JSON.parse(p.exercises); } catch {}
            return (
              <button key={p._id} type="button" onClick={() => onSelect(p)}
                className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-[var(--color-bg-subtle)] hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p>
                {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.description}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · from {p.coachName}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Exercise Form ──────────────────────────────────────────────────────────────
export default function ExerciseLogForm({ dateStr, onSave, onCancel }) {
  const [time]                      = useState(() => getCurrentTimeParts());
  const [exercises, setExercises]   = useState([emptyExercise()]);
  const [showPicker, setShowPicker] = useState(false);

  const updateEx = (i, updated) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? updated : ex));
  const removeEx = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i));
  const addEx    = () => setExercises(prev => [...prev.map(e => ({ ...e, expanded: false })), emptyExercise()]);

  const loadProgram = (program) => {
    let parsed = [];
    try { parsed = JSON.parse(program.exercises); } catch {}
    setExercises(parsed.length > 0
      ? parsed.map(e => ({ ...normaliseEx(e), id: Date.now() + Math.random(), expanded: true }))
      : [emptyExercise()]
    );
    setShowPicker(false);
  };

  const handleSave = () => {
    const named = exercises.filter(e => e.name.trim());
    if (named.length === 0) return;
    const entries = named.map(e => ({
      type: 'exercise',
      date: dateStr,
      time,
      name: e.name.trim(),
      exercisesData: JSON.stringify([
        { reps: e.reps || '', load: e.load || '' },
        ...(e.extraSets ?? []).map(s => ({ reps: s.reps || '', load: s.load || '' })),
      ]),
      notes: e.notes?.trim() || undefined,
    }));
    onSave(entries);
  };

  return (
    <>
      {showPicker && <CoachProgramPicker onSelect={loadProgram} onClose={() => setShowPicker(false)} />}

      <div className="flex justify-end mb-3">
        <button type="button" onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Load coach program
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id ?? i}
            ex={ex}
            index={i}
            onChange={updated => updateEx(i, updated)}
            onRemove={() => removeEx(i)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <button type="button" onClick={addEx}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Exercise
        </button>
        <button type="button" onClick={handleSave}
          disabled={!exercises.some(e => e.name.trim())}
          className="py-3 rounded-xl bg-gray-900 dark:bg-gray-700 text-white text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-40 transition-all">
          Save to entry
        </button>
      </div>

      <button type="button" onClick={onCancel}
        className="w-full mt-2 py-3 rounded-xl bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm font-bold transition-all">
        Cancel
      </button>
    </>
  );
}
