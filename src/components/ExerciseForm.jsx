import { useState, useRef, useEffect, useMemo } from "react";
import healthDB from "../lib/database.js";
import { useLibraryPlaceholders } from "../hooks/useLibraryPlaceholders.js";
import { useToast } from "../hooks/useToast.js";
import { ToastContainer } from "./ui/Toast.jsx";

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

const ACTIVITY_SUGGESTIONS = [
  "Walking", "Running", "Jogging", "Cycling", "Swimming",
  "Hiking", "Steps", "Jump Rope", "Rowing", "Yoga",
  "Pilates", "Dancing", "Rock Climbing", "Kayaking",
  "Stretching", "HIIT", "Circuit Training", "Gardening",
  "Housework", "Football", "Basketball", "Tennis", "Golf",
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
const CopyIcon  = () => <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />;
const PlusIcon  = () => <Icon className="w-4 h-4" d="M12 4v16m8-8H4" />;
const CheckIcon = () => <Icon className="w-3.5 h-3.5" d="M5 13l4 4L19 7" />;
const PencilIcon = () => (
  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const XIcon = () => <Icon className="w-4 h-4" d="M6 18L18 6M6 6l12 12" />;

// ─── Exercise name autocomplete (exported for use in DateTimeSelector) ─────────
export function ExerciseSearch({
  value,
  onChange,
  onSelectLibraryItem,
  placeholder = "e.g. Bench Press",
  suggestions: customSuggestions,
  inputClassName,
  dropdownClassName,
  optionClassName,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef(null);
  const staticSuggestions = customSuggestions ?? EXERCISE_SUGGESTIONS;
  const [libraryItems, setLibraryItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined") return;
        if (!healthDB.db) await healthDB.init();
        const items = await healthDB.getExerciseItems("", 48);
        if (!cancelled) setLibraryItems(items || []);
      } catch {
        if (!cancelled) setLibraryItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const options = useMemo(() => {
    const lib = libraryItems
      .filter((it) => it?.name && String(it.name).trim())
      .map((item) => ({ kind: "lib", label: String(item.name).trim(), item }));
    const seen = new Set(lib.map((o) => o.label.toLowerCase()));
    const rest = [];
    for (const s of staticSuggestions) {
      const str = typeof s === "string" ? s : (s?.name ?? "");
      if (!str || seen.has(str.toLowerCase())) continue;
      seen.add(str.toLowerCase());
      rest.push({ kind: "str", label: str });
    }
    return [...lib, ...rest];
  }, [libraryItems, staticSuggestions]);

  const filtered = useMemo(() => {
    const qn = (q || "").trim().toLowerCase();
    if (!qn) return options.slice(0, 10);
    return options.filter((o) => o.label.toLowerCase().includes(qn)).slice(0, 10);
  }, [q, options]);

  useEffect(() => {
    setQ(value ?? "");
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selectOption = (o) => {
    setQ(o.label);
    onChange(o.label);
    if (o.kind === "lib" && onSelectLibraryItem) onSelectLibraryItem(o.item);
    setOpen(false);
  };

  const defaultInput = "w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const defaultDropdown = "absolute z-30 top-full mt-1 w-full bg-white dark:bg-[var(--color-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto";
  const defaultOption = "w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors";

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={q}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName ?? defaultInput}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className={dropdownClassName ?? defaultDropdown}>
          {filtered.map((o) => (
            <button
              key={o.kind === "lib" ? `lib-${o.item.id ?? o.label}` : `st-${o.label}`}
              type="button"
              className={optionClassName ?? defaultOption}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => selectOption(o)}
            >
              {o.label}
              {o.kind === "lib" && (o.item.defaultSets || o.item.defaultReps) && (
                <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                  {o.item.defaultSets != null && `${o.item.defaultSets} sets`}
                  {o.item.defaultSets != null && o.item.defaultLoad != null && String(o.item.defaultLoad).trim() !== "" && " · "}
                  {o.item.defaultLoad != null && String(o.item.defaultLoad).trim() !== "" && `${o.item.defaultLoad}`}
                  {((o.item.defaultSets != null) || (o.item.defaultLoad != null && String(o.item.defaultLoad).trim() !== "")) && o.item.defaultReps != null && " · "}
                  {o.item.defaultReps != null && `${o.item.defaultReps} reps`}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { EXERCISE_SUGGESTIONS };

// ─── Single exercise card ────────────────────────────────────────────────────
/** Wider pill inputs for the set / reps / load grid (workout-log style). */
const tableSetInput =
  "w-full min-w-0 bg-white/95 dark:bg-white/[0.08] border border-gray-200 dark:border-gray-600/60 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/45 focus:border-blue-500 transition-colors text-center";

function ExerciseCard({
  exercise,
  index,
  onChange,
  onRemove,
  historyMatch,
  onAddExercise,
  repsPlaceholder = "",
  loadPlaceholder = "",
}) {
  const isComplete = exercise.name && exercise.sets && exercise.reps;
  const totalSetRows = 1 + (Array.isArray(exercise.extraSets) ? exercise.extraSets.length : 0);

  const applyHistory = () => {
    onChange({ ...exercise, sets: historyMatch.sets, reps: historyMatch.reps, load: historyMatch.load, notes: historyMatch.notes, fromHistory: true });
  };

  const appendExtraSet = () => {
    const extra = Array.isArray(exercise.extraSets) ? exercise.extraSets : [];
    const rowAbove =
      extra.length > 0 ? extra[extra.length - 1] : { reps: exercise.reps, load: exercise.load };
    const nextExtra = [
      ...extra,
      { sets: '', reps: rowAbove.reps || '', load: rowAbove.load || '' },
    ];
    const totalSets = 1 + nextExtra.length;
    onChange({
      ...exercise,
      extraSets: nextExtra,
      sets: String(totalSets),
      fromHistory: false,
    });
  };

  const handlePrimaryRepsChange = (value) => {
    const extra = Array.isArray(exercise.extraSets) ? exercise.extraSets : [];
    const syncedExtra = extra.map((set) => {
      if ((set?.reps == null || String(set.reps).trim() === '') && value.trim() !== '') {
        return { ...set, reps: value };
      }
      return set;
    });
    onChange({ ...exercise, reps: value, extraSets: syncedExtra, fromHistory: false });
  };

  const handlePrimaryLoadChange = (value) => {
    const extra = Array.isArray(exercise.extraSets) ? exercise.extraSets : [];
    const syncedExtra = extra.map((set) => {
      if ((set?.load == null || String(set.load).trim() === '') && value.trim() !== '') {
        return { ...set, load: value };
      }
      return set;
    });
    onChange({ ...exercise, load: value, extraSets: syncedExtra, fromHistory: false });
  };

  const removeSetAt = (rowIndex) => {
    const extra = Array.isArray(exercise.extraSets) ? [...exercise.extraSets] : [];
    if (rowIndex === 0) {
      if (extra.length === 0) return;
      const [promoted, ...rest] = extra;
      onChange({
        ...exercise,
        reps: promoted?.reps ?? "",
        load: promoted?.load ?? "",
        extraSets: rest,
        sets: String(1 + rest.length),
        fromHistory: false,
      });
      return;
    }
    const i = rowIndex - 1;
    const nextExtra = extra.filter((_, j) => j !== i);
    onChange({
      ...exercise,
      extraSets: nextExtra,
      sets: String(1 + nextExtra.length),
      fromHistory: false,
    });
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 ${isComplete ? "border-blue-500/30 bg-gray-50 dark:bg-[var(--color-bg-muted)]" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-muted)]"}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => onChange({ ...exercise, expanded: !exercise.expanded })}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isComplete ? "bg-blue-600 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}>
          {isComplete ? <CheckIcon /> : index + 1}
        </div>
        <span className={`flex-1 text-sm font-semibold truncate min-w-0 ${exercise.name ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
          {exercise.name || "New exercise"}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap mr-1 max-[380px]:hidden">
          {totalSetRows} set{totalSetRows === 1 ? "" : "s"}
          {isComplete && (exercise.load || exercise.reps) ? ` · ${exercise.load || '—'} · ${exercise.reps || '—'} reps` : ""}
        </span>
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
        <div className="px-3.5 pb-3.5 space-y-4 border-t border-gray-200 dark:border-gray-600/50 pt-3">

          {/* "Use last" banner — shown when name matches history and not yet loaded */}
          {historyMatch && !exercise.fromHistory && (
            <button onClick={applyHistory}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-all text-xs font-semibold">
              <ClockIcon />
              <span className="flex-1 text-left">
                Last: {historyMatch.sets} sets{historyMatch.load ? ` · ${historyMatch.load}kg` : " · —"}{historyMatch.reps ? ` · ${historyMatch.reps} reps` : ""}
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
            <ExerciseSearch
              value={exercise.name}
              placeholder=""
              onChange={(val) => onChange({ ...exercise, name: val, fromHistory: false })}
              onSelectLibraryItem={(item) => {
                onChange({
                  ...exercise,
                  name: item.name || exercise.name,
                  fromHistory: false,
                  ...(item.defaultReps != null && String(item.defaultReps).trim() !== ""
                    ? { reps: String(item.defaultReps) }
                    : {}),
                  ...(item.defaultLoad != null && String(item.defaultLoad).trim() !== ""
                    ? { load: String(item.defaultLoad) }
                    : {}),
                  ...(item.defaultSets != null && String(item.defaultSets).trim() !== ""
                    ? { sets: String(item.defaultSets) }
                    : {}),
                });
              }}
            />
          </div>

          {/* Sets grid — Set / Load / Reps table + row remove + Add Set (reference UI) */}
          <div className="rounded-xl border border-gray-200/90 dark:border-gray-600/45 bg-white/55 dark:bg-white/[0.05] dark:backdrop-blur-md p-3 sm:p-4 space-y-2 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-x-2 sm:gap-3 items-end px-0.5 pb-1">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                Set
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Load
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reps
              </span>
              <span className="sr-only">Remove set</span>
            </div>

            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-x-2 sm:gap-3 items-center">
              <div className="flex justify-center text-sm font-medium tabular-nums text-gray-700 dark:text-gray-200">
                1
              </div>
              <input
                type="text"
                value={exercise.load}
                placeholder={loadPlaceholder}
                aria-label="Load or time for set 1"
                title="Load (weight) or time"
                onChange={(e) => handlePrimaryLoadChange(e.target.value)}
                className={tableSetInput}
              />
              <input
                type="text"
                value={exercise.reps}
                placeholder={repsPlaceholder}
                aria-label="Reps for set 1"
                onChange={(e) => handlePrimaryRepsChange(e.target.value)}
                className={tableSetInput}
              />
              <div className="flex justify-center">
                {totalSetRows > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSetAt(0); }}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors touch-manipulation"
                    title="Remove set"
                    aria-label="Remove set 1"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            </div>

            {Array.isArray(exercise.extraSets) && exercise.extraSets.map((s, idx) => (
              <div key={idx} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-x-2 sm:gap-3 items-center">
                <div className="flex justify-center text-sm font-medium tabular-nums text-gray-700 dark:text-gray-200">
                  {idx + 2}
                </div>
                <input
                  type="text"
                  value={s.load || ""}
                  placeholder={loadPlaceholder}
                  aria-label={`Load or time for set ${idx + 2}`}
                  title="Load (weight) or time"
                  onChange={(e) => {
                    const next = [...exercise.extraSets];
                    next[idx] = { ...next[idx], load: e.target.value };
                    onChange({ ...exercise, extraSets: next, fromHistory: false });
                  }}
                  className={tableSetInput}
                />
                <input
                  type="text"
                  value={s.reps || ""}
                  placeholder={repsPlaceholder}
                  aria-label={`Reps for set ${idx + 2}`}
                  onChange={(e) => {
                    const next = [...exercise.extraSets];
                    next[idx] = { ...next[idx], reps: e.target.value };
                    onChange({ ...exercise, extraSets: next, fromHistory: false });
                  }}
                  className={tableSetInput}
                />
                <div className="flex justify-center">
                  {totalSetRows > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSetAt(idx + 1); }}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors touch-manipulation"
                      title="Remove set"
                      aria-label={`Remove set ${idx + 2}`}
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {onAddExercise && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  title="Add set"
                  aria-label="Add set"
                  onClick={(e) => { e.stopPropagation(); appendExtraSet(); }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 bg-white/90 dark:bg-white/[0.08] border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-300 transition-colors touch-manipulation shadow-sm"
                >
                  <PlusIcon /> Add Set
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea rows={3} value={exercise.notes}
              placeholder="Additional notes..."
              onChange={e => onChange({ ...exercise, notes: e.target.value })}
              className="w-full bg-white/95 dark:bg-white/[0.07] border border-gray-200 dark:border-gray-600/60 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/45 focus:border-blue-500 transition-colors resize-none min-h-[5rem]" />
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Video Link</label>
            <input type="url" value={exercise.videoUrl}
              onChange={e => onChange({ ...exercise, videoUrl: e.target.value })}
              className="w-full bg-white/95 dark:bg-white/[0.07] border border-gray-200 dark:border-gray-600/60 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/45 focus:border-blue-500 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity ────────────────────────────────────────────────────────────────
const newActivity = (overrides = {}) => ({
  id: Date.now() + Math.random(),
  name: "",
  duration: "",
  distance: "",
  steps: "",
  notes: "",
  expanded: true,
  isActivity: true,
  ...overrides,
});

const activityInput =
  "w-full bg-white/95 dark:bg-white/[0.08] border border-gray-200 dark:border-gray-600/60 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/45 focus:border-green-500 transition-colors";

function ActivityCard({ activity, index, onChange, onRemove }) {
  const isComplete = activity.name && activity.duration;

  return (
    <div className={`rounded-xl border transition-all duration-200 ${isComplete ? "border-green-500/30 bg-gray-50 dark:bg-[var(--color-bg-muted)]" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-muted)]"}`}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => onChange({ ...activity, expanded: !activity.expanded })}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isComplete ? "bg-green-600 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"}`}>
          {isComplete ? <CheckIcon /> : index + 1}
        </div>
        <span className={`flex-1 text-sm font-semibold truncate min-w-0 ${activity.name ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
          {activity.name || "New activity"}
        </span>
        {activity.duration && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap mr-1 max-[380px]:hidden">
            {activity.duration} min
            {activity.distance ? ` · ${activity.distance} km` : ""}
            {activity.steps ? ` · ${activity.steps} steps` : ""}
          </span>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange({ ...activity, expanded: !activity.expanded }); }}
          className="p-2 text-gray-400 hover:text-green-600 transition-colors touch-manipulation shrink-0"
          title={activity.expanded ? "Done editing" : "Edit activity"}
          aria-label={activity.expanded ? "Done editing" : "Edit activity"}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors touch-manipulation shrink-0"
          title="Remove activity"
          aria-label="Remove activity"
        >
          <TrashIcon />
        </button>
        <ChevronDown open={activity.expanded} cls="text-gray-500 dark:text-gray-400 shrink-0" />
      </div>

      {activity.expanded && (
        <div className="px-3.5 pb-3.5 space-y-4 border-t border-gray-200 dark:border-gray-600/50 pt-3">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Activity</label>
            <ExerciseSearch
              value={activity.name}
              placeholder="e.g. Walking"
              suggestions={ACTIVITY_SUGGESTIONS}
              onChange={val => onChange({ ...activity, name: val })}
            />
          </div>

          {/* Duration + Distance + Steps */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Duration (min)</label>
              <input
                type="number"
                min="1"
                value={activity.duration}
                placeholder="30"
                onChange={e => onChange({ ...activity, duration: e.target.value })}
                className={activityInput}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Distance (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={activity.distance}
                placeholder="—"
                onChange={e => onChange({ ...activity, distance: e.target.value })}
                className={activityInput}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Steps</label>
              <input
                type="number"
                min="0"
                value={activity.steps}
                placeholder="—"
                onChange={e => onChange({ ...activity, steps: e.target.value })}
                className={activityInput}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={activity.notes}
              placeholder="Additional notes..."
              onChange={e => onChange({ ...activity, notes: e.target.value })}
              className="w-full bg-white/95 dark:bg-white/[0.07] border border-gray-200 dark:border-gray-600/60 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/45 focus:border-green-500 transition-colors resize-none"
            />
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
export default function WorkoutLogger({
  embedded,
  selectedDate,
  time,
  onSave,
  onCancel,
  initialExercises,
  editId,
  editSessionEntryIds,
  /** When true (embedded edit session), start with an extra blank row like clicking “Add Exercise” in-form */
  initialAppendBlankExercise = false,
}) {
  const libPh = useLibraryPlaceholders({ enabled: typeof window !== "undefined" });

  const today   = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [date, setDate]           = useState(today);
  const [timeLocal, setTimeLocal]  = useState(nowTime);
  const [exercises, setExercises]  = useState(() => {
    if (initialExercises && Array.isArray(initialExercises) && initialExercises.length > 0) {
      let rows = initialExercises.map((e, i) => newEx({
        name: e.name ?? "",
        sets: e.sets ?? "",
        reps: e.reps ?? "",
        load: e.load ?? "",
        extraSets: Array.isArray(e.extraSets) ? e.extraSets : [],
        notes: e.notes ?? "",
        videoUrl: e.videoUrl ?? "",
        entryId: e.entryId,
        expanded: i === 0
      }));
      if (initialAppendBlankExercise) {
        rows = [...rows.map((e) => ({ ...e, expanded: false })), newEx({ expanded: true })];
      }
      return rows;
    }
    return [];
  });
  const [activities, setActivities] = useState([]);
  const [saved, setSaved]           = useState(false);
  const { toasts, showToast }       = useToast();

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

  const showFlash = (msg) => showToast(msg, 'info');

  const addExercise = () =>
    setExercises(prev => [...prev.map(e => ({ ...e, expanded: false })), newEx()]);

  const addActivity = () =>
    setActivities(prev => [...prev.map(a => ({ ...a, expanded: false })), newActivity()]);

  const update = (id, updated) => setExercises(prev => prev.map(e => e.id === id ? updated : e));
  const remove = (id)          => setExercises(prev => prev.filter(e => e.id !== id));

  const updateActivity = (id, updated) => setActivities(prev => prev.map(a => a.id === id ? updated : a));
  const removeActivity = (id)          => setActivities(prev => prev.filter(a => a.id !== id));

  const handleSave = () => {
    const namedExercises = exercises.filter(e => e.name && String(e.name).trim());
    const namedActivities = activities.filter(a => a.name && String(a.name).trim());
    if (isEmbedded && onSave) {
      if (namedExercises.length === 0 && namedActivities.length === 0) {
        showFlash("Add at least one exercise or activity.");
        return;
      }
      onSave(namedExercises, {
        primaryEditId: editId,
        sessionEntryIds: Array.isArray(editSessionEntryIds) ? editSessionEntryIds : [],
        activities: namedActivities,
      });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const hasAnyNamed = exercises.some(e => e.name) || activities.some(a => a.name);
  const completedCount = exercises.filter(e => e.name && e.sets && e.reps).length;

  const content = (
    <div className={isEmbedded ? "space-y-4" : "max-w-lg mx-auto px-4 py-4 space-y-4 pb-10"}>
      {!isEmbedded && (
        <>
          {/* Date card - same style as Add Measurements */}
          <section className="space-y-4" aria-label="Date">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">Log</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      )}

      {exercises.length > 0 && (
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
              repsPlaceholder={libPh.exerciseRepsPlaceholder}
              loadPlaceholder={libPh.exerciseLoadPlaceholder}
            />
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div className="space-y-2.5">
          {activities.map((act, i) => (
            <ActivityCard
              key={act.id}
              activity={act}
              index={i}
              onChange={u => updateActivity(act.id, u)}
              onRemove={() => removeActivity(act.id)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={addExercise}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-semibold group">
          <span className="group-hover:rotate-90 transition-transform duration-200"><PlusIcon /></span>
          Add Exercise
        </button>
        <button type="button" onClick={addActivity}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-all text-sm font-semibold group">
          <span className="group-hover:rotate-90 transition-transform duration-200"><PlusIcon /></span>
          Add Activity
        </button>
      </div>

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
        hasAnyNamed && (
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
      <>
        <ToastContainer toasts={toasts} />
        {content}
      </>
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
      <ToastContainer toasts={toasts} />
      {content}
    </div>
  );
}
