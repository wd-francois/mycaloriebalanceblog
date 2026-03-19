import { useState, useRef, useEffect } from "react";

// ─── Mock history (simulates saved past workouts) ───────────────────────────
const WORKOUT_HISTORY = [
  {
    id: "w1",
    date: "2025-03-10",
    label: "Mon — Push Day",
    exercises: [
      { name: "Bench Press",      sets: "4", reps: "8",   load: "100", notes: "Pause at bottom", videoUrl: "" },
      { name: "Overhead Press",   sets: "3", reps: "10",  load: "60",  notes: "",                videoUrl: "" },
      { name: "Incline Bench Press", sets: "3", reps: "12", load: "75", notes: "",               videoUrl: "" },
      { name: "Lateral Raise",    sets: "4", reps: "15",  load: "12",  notes: "Slow eccentric",  videoUrl: "" },
      { name: "Tricep Dip",       sets: "3", reps: "12",  load: "",    notes: "",                videoUrl: "" },
    ],
  },
  {
    id: "w2",
    date: "2025-03-08",
    label: "Sat — Pull Day",
    exercises: [
      { name: "Deadlift",         sets: "4", reps: "5",   load: "160", notes: "Belt on last 2", videoUrl: "" },
      { name: "Pull Up",          sets: "4", reps: "8",   load: "",    notes: "",               videoUrl: "" },
      { name: "Pendlay Row",      sets: "3", reps: "8",   load: "90",  notes: "",               videoUrl: "" },
      { name: "Lat Pulldown",     sets: "3", reps: "12",  load: "70",  notes: "",               videoUrl: "" },
      { name: "Bicep Curl",       sets: "3", reps: "12",  load: "20",  notes: "",               videoUrl: "" },
    ],
  },
  {
    id: "w3",
    date: "2025-03-06",
    label: "Thu — Leg Day",
    exercises: [
      { name: "Back Squat",       sets: "5", reps: "5",   load: "120", notes: "High bar",       videoUrl: "" },
      { name: "Romanian Deadlift",sets: "3", reps: "10",  load: "90",  notes: "",               videoUrl: "" },
      { name: "Hip Thrust",       sets: "4", reps: "12",  load: "100", notes: "",               videoUrl: "" },
      { name: "Bulgarian Split Squat", sets: "3", reps: "10", load: "30", notes: "",            videoUrl: "" },
      { name: "Hanging Leg Raise",sets: "3", reps: "15",  load: "",    notes: "",               videoUrl: "" },
    ],
  },
];

const EXERCISE_SUGGESTIONS = [
  "Back Squat","Front Squat","Goblet Squat","Hack Squat",
  "Bench Press","Incline Bench Press","Decline Bench Press","Dumbbell Bench Press",
  "Deadlift","Romanian Deadlift","Sumo Deadlift","Trap Bar Deadlift",
  "Overhead Press","Push Press","Arnold Press","Lateral Raise",
  "Pull Up","Chin Up","Lat Pulldown","Seated Row","Pendlay Row",
  "Hip Thrust","Bulgarian Split Squat","Lunge","Step Up",
  "Bicep Curl","Hammer Curl","Tricep Dip","Skull Crusher",
  "Plank","Ab Wheel","Cable Crunch","Hanging Leg Raise",
];

const newEx = (overrides = {}) => ({
  id: Date.now() + Math.random(),
  name: "",
  // Primary set fields (first set)
  sets: "1",
  reps: "",
  load: "",
  // Additional sets beyond the first (array of { reps, load })
  extraSets: [],
  notes: "",
  videoUrl: "",
  expanded: true,
  fromHistory: false,
  ...overrides,
});

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const ChevronDown = ({ open, cls = "" }) => (
  <Icon className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""} ${cls}`} d="M19 9l-7 7-7-7" />
);
const TrashIcon = () => <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;
const ClockIcon = () => <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />;
const ZapIcon   = () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const CopyIcon  = () => <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />;
const PlusIcon  = () => <Icon className="w-4 h-4" d="M12 4v16m8-8H4" />;
const CheckIcon = () => <Icon className="w-3.5 h-3.5" d="M5 13l4 4L19 7" />;
const PencilIcon = () => (
  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// ─── Exercise name autocomplete (exported for use in DateTimeSelector) ─────────
export function ExerciseSearch({
  value,
  onChange,
  placeholder = "e.g. Bench Press",
  suggestions: customSuggestions,
  inputClassName,
  dropdownClassName,
  optionClassName,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef(null);
  const suggestions = customSuggestions ?? EXERCISE_SUGGESTIONS;
  const filtered = q.length > 0
    ? suggestions.filter(e => (typeof e === "string" ? e : e.name || e).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    setQ(value ?? "");
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = (item) => {
    const name = typeof item === "string" ? item : (item?.name ?? "");
    setQ(name);
    onChange(name);
    setOpen(false);
  };

  const defaultInput = "w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const defaultDropdown = "absolute z-30 top-full mt-1 w-full bg-white dark:bg-[var(--color-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden";
  const defaultOption = "w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors";

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={q}
        placeholder={placeholder}
        className={inputClassName ?? defaultInput}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => q.length > 0 && setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className={dropdownClassName ?? defaultDropdown}>
          {filtered.map(s => {
            const label = typeof s === "string" ? s : (s.name ?? "");
            return (
              <button key={label} type="button" className={optionClassName ?? defaultOption}
                onMouseDown={() => select(s)}>{label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { EXERCISE_SUGGESTIONS };

// ─── Single exercise card ────────────────────────────────────────────────────
function ExerciseCard({ exercise, index, onChange, onRemove, historyMatch, onAddExercise }) {
  const isComplete = exercise.name && exercise.sets && exercise.reps;

  const applyHistory = () => {
    onChange({ ...exercise, sets: historyMatch.sets, reps: historyMatch.reps, load: historyMatch.load, notes: historyMatch.notes, fromHistory: true });
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 ${isComplete ? "border-blue-500/30 bg-gray-50 dark:bg-[var(--color-bg-muted)]" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-muted)]"}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => onChange({ ...exercise, expanded: !exercise.expanded })}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isComplete ? "bg-blue-600 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}>
          {isComplete ? <CheckIcon /> : index + 1}
        </div>
        <span className={`flex-1 text-sm font-semibold truncate ${exercise.name ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
          {exercise.name || "New exercise"}
        </span>
        {isComplete && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 mr-1">
            {exercise.sets}x{exercise.reps}{exercise.load ? ` · ${exercise.load}kg` : ""}
          </span>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange({ ...exercise, expanded: !exercise.expanded }); }}
          className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors touch-manipulation shrink-0"
          title={exercise.expanded ? "Done editing" : "Edit exercise"}
          aria-label={exercise.expanded ? "Done editing" : "Edit exercise"}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-2 sm:p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors touch-manipulation shrink-0"
          title="Remove exercise"
          aria-label="Remove exercise"
        >
          <TrashIcon />
        </button>
        <ChevronDown open={exercise.expanded} cls="text-gray-500 dark:text-gray-400 shrink-0" />
      </div>

      {exercise.expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">

          {/* "Use last" banner — shown when name matches history and not yet loaded */}
          {historyMatch && !exercise.fromHistory && (
            <button onClick={applyHistory}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-all text-xs font-semibold">
              <ClockIcon />
              <span className="flex-1 text-left">
                Last: {historyMatch.sets}x{historyMatch.reps}{historyMatch.load ? ` @ ${historyMatch.load}kg` : ""}
                {historyMatch.notes ? ` — "${historyMatch.notes}"` : ""}
              </span>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">Use →</span>
            </button>
          )}
          {exercise.fromHistory && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs">
              <CheckIcon /> Loaded from last session — tweak as needed
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Exercise</label>
            <ExerciseSearch value={exercise.name} onChange={val => onChange({ ...exercise, name: val, fromHistory: false })} />
          </div>

          {/* Set / Reps / Load/Time - header + primary set */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="grid grid-cols-3 gap-2 flex-1">
              {["Set", "Reps", "Load/Time"].map(label => (
                <div key={label}>
                  <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {onAddExercise && (
              <button
                type="button"
                onClick={() => {
                  const extra = Array.isArray(exercise.extraSets) ? exercise.extraSets : [];
                  const nextExtra = [...extra, { sets: '', reps: '', load: '' }];
                  const totalSets = 1 + nextExtra.length;
                  onChange({
                    ...exercise,
                    extraSets: nextExtra,
                    sets: String(totalSets),
                    fromHistory: false
                  });
                }}
                className="ml-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed border-blue-400 text-[11px] font-medium text-blue-600 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/25 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M7 3a1 1 0 0 1 2 0v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 1 1 0-2h4V3z" fill="currentColor" />
                  </svg>
                </span>
                <span>Add set</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[["sets","4"],["reps","8"],["load","80"]].map(([key, ph]) => (
              <div key={key}>
                <input
                  type="text"
                  placeholder={ph}
                  value={exercise[key]}
                  aria-label={key === 'sets' ? 'Set' : key === 'reps' ? 'Reps' : 'Load/Time'}
                  onChange={e => onChange({ ...exercise, [key]: e.target.value, fromHistory: false })}
                  className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center"
                />
              </div>
            ))}
          </div>

          {/* Additional sets */}
          {Array.isArray(exercise.extraSets) && exercise.extraSets.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {exercise.extraSets.map((s, idx) => (
                <div key={idx} className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-2 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      {`Set ${idx + 2}`}
                    </label>
                    <input
                      type="text"
                      placeholder="4"
                      value={s.sets || ''}
                      onChange={e => {
                        const next = [...exercise.extraSets];
                        next[idx] = { ...next[idx], sets: e.target.value };
                        onChange({ ...exercise, extraSets: next, fromHistory: false });
                      }}
                      className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Reps
                    </label>
                    <input
                      type="text"
                      placeholder="8"
                      value={s.reps || ''}
                      onChange={e => {
                        const next = [...exercise.extraSets];
                        next[idx] = { ...next[idx], reps: e.target.value };
                        onChange({ ...exercise, extraSets: next, fromHistory: false });
                      }}
                      className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Load/Time
                    </label>
                    <input
                      type="text"
                      placeholder="80"
                      value={s.load || ''}
                      onChange={e => {
                        const next = [...exercise.extraSets];
                        next[idx] = { ...next[idx], load: e.target.value };
                        onChange({ ...exercise, extraSets: next, fromHistory: false });
                      }}
                      className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const extra = Array.isArray(exercise.extraSets) ? exercise.extraSets : [];
                      const nextExtra = extra.filter((_, i) => i !== idx);
                      const totalSets = 1 + nextExtra.length;
                      onChange({
                        ...exercise,
                        extraSets: nextExtra,
                        sets: String(totalSets),
                        fromHistory: false
                      });
                    }}
                    className="self-center p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete set"
                    aria-label="Delete set"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea placeholder="Cues, tempo, RPE..." rows={2} value={exercise.notes}
              onChange={e => onChange({ ...exercise, notes: e.target.value })}
              className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none" />
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Video Link</label>
            <input type="url" placeholder="https://youtube.com/..." value={exercise.videoUrl}
              onChange={e => onChange({ ...exercise, videoUrl: e.target.value })}
              className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Previous workout repeat panel ──────────────────────────────────────────
function WorkoutHistoryPanel({ onRepeat }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-muted)] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
          <ClockIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Repeat a past workout</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Load all exercises from a previous session</p>
        </div>
        <ChevronDown open={open} cls="text-gray-500 dark:text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {WORKOUT_HISTORY.map(w => (
            <div key={w.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{w.label}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{w.date}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {w.exercises.map(e => (
                    <span key={e.name} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">
                      {e.name}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => { onRepeat(w); setOpen(false); }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-lg transition-all mt-0.5">
                <CopyIcon /> Repeat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function WorkoutLogger({ embedded, selectedDate, time, onSave, onCancel, initialExercises, editId }) {
  const today   = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [date, setDate]           = useState(today);
  const [timeLocal, setTimeLocal]  = useState(nowTime);
  const [exercises, setExercises]  = useState(() => {
    if (initialExercises && Array.isArray(initialExercises) && initialExercises.length > 0) {
      return initialExercises.map((e, i) => newEx({
        name: e.name ?? "",
        sets: e.sets ?? "",
        reps: e.reps ?? "",
        load: e.load ?? "",
        notes: e.notes ?? "",
        expanded: i === 0
      }));
    }
    return [newEx()];
  });
  const [saved, setSaved]         = useState(false);
  const [flash, setFlash]         = useState(null);

  const isEmbedded = !!embedded;

  // Flat lookup: exercise name → last used values
  const lastUsed = {};
  WORKOUT_HISTORY.forEach(w => {
    w.exercises.forEach(e => { if (!lastUsed[e.name]) lastUsed[e.name] = e; });
  });

  const repeatWorkout = (w) => {
    const loaded = w.exercises.map((e, i) =>
      newEx({ ...e, expanded: i === 0, fromHistory: true })
    );
    setExercises(loaded);
    showFlash(`"${w.label}" loaded — ${loaded.length} exercises ready`);
  };

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 3000); };

  const addExercise = () =>
    setExercises(prev => [...prev.map(e => ({ ...e, expanded: false })), newEx()]);

  const update = (id, updated) => setExercises(prev => prev.map(e => e.id === id ? updated : e));
  const remove = (id)          => setExercises(prev => prev.filter(e => e.id !== id));

  const handleSave = () => {
    if (isEmbedded && onSave) {
      const withNames = exercises.filter(e => e.name && String(e.name).trim());
      if (withNames.length === 0) {
        showFlash("Add at least one exercise with a name.");
        return;
      }
      onSave(withNames, editId);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const completedCount = exercises.filter(e => e.name && e.sets && e.reps).length;

  const content = (
    <div className={isEmbedded ? "space-y-4" : "max-w-lg mx-auto px-4 py-4 space-y-4 pb-10"}>
      {!isEmbedded && (
        <>
          {/* Date card - same style as Add Measurements */}
          <section className="space-y-4" aria-label="Date">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </section>
          {/* Time */}
          <section className="space-y-4" aria-label="Time">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time
              </label>
              <input
                type="time"
                value={timeLocal}
                onChange={e => setTimeLocal(e.target.value)}
                className="w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </section>
          <WorkoutHistoryPanel onRepeat={repeatWorkout} />
        </>
      )}

      {!isEmbedded && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">Exercises</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      )}

      <div className="space-y-2.5">
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            index={i}
            onChange={u => update(ex.id, u)}
            onRemove={() => remove(ex.id)}
            historyMatch={ex.name ? lastUsed[ex.name] : null}
            onAddExercise={addExercise}
          />
        ))}
      </div>

      <button type="button" onClick={addExercise}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-semibold group">
        <span className="group-hover:rotate-90 transition-transform duration-200"><PlusIcon /></span>
        Add Exercise
      </button>

      {isEmbedded ? (
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white transition-all">
            Save to entry
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white transition-all">
              Cancel
            </button>
          )}
        </div>
      ) : (
        exercises.length >= 2 && (
          <button type="button" onClick={handleSave}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${saved ? "bg-green-600 text-white" : "bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white"}`}>
            {saved ? "✓ Workout Saved!" : "Save Workout"}
          </button>
        )
      )}
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="bg-gray-50 dark:bg-[var(--color-bg-muted)] text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        {flash && (
          <div className="mb-4 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg flex items-center gap-2">
            <ZapIcon /> {flash}
          </div>
        )}
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--color-bg-base)] text-gray-900 dark:text-white">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[var(--color-bg-base)]/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold tracking-widest text-gray-900 dark:text-white uppercase">Workout Log</h1>
            {completedCount > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{completedCount}/{exercises.length} complete</p>
            )}
          </div>
          <button type="button" onClick={handleSave}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${saved ? "bg-green-600 text-white" : "bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white"}`}>
            {saved ? "✓ Saved!" : "Save"}
          </button>
        </div>
      </div>
      {flash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-800 dark:bg-gray-700 border border-gray-600 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <ZapIcon /> {flash}
        </div>
      )}
      {content}
    </div>
  );
}
