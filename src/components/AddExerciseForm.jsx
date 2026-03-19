import { useState, useRef, useEffect } from "react";

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root {
    --brand: #e8ff47;
    --brand-dim: #c8df27;
    --surface: #111213;
    --surface-2: #1a1b1d;
    --surface-3: #222426;
    --border: rgba(255,255,255,0.08);
    --border-active: rgba(232,255,71,0.4);
    --text: #f0f0f0;
    --text-muted: #6b7280;
    --danger: #ff4d4d;
    --success: #34d399;
  }

  .wl-embedded {
    --surface: #ffffff;
    --surface-2: #f9fafb;
    --surface-3: #f3f4f6;
    --border: rgba(0,0,0,0.1);
    --border-active: rgba(59,130,246,0.5);
    --text: #111827;
    --text-muted: #6b7280;
  }
  .wl-embedded .wl-input:focus { color: var(--text); }
  .wl-embedded .sets-row:hover { background: rgba(0,0,0,0.03); }
  .wl-embedded .sets-row-input:focus { background: rgba(59,130,246,0.06); color: var(--text); }
  .wl-embedded .sets-table { border-top-color: rgba(0,0,0,0.08); }
  .wl-embedded .sets-add-row { border-top-color: rgba(0,0,0,0.1); }
  .wl-embedded .sets-add-btn:hover { color: #2563eb; background: rgba(59,130,246,0.08); }
  .wl-embedded .add-ex-btn { border-color: rgba(0,0,0,0.15); }
  .wl-embedded .add-ex-btn:hover { border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.04); }

  .wl-root * { box-sizing: border-box; }
  .wl-root { font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--text); min-height: 100vh; }

  .wl-header {
    position: sticky; top: 0; z-index: 20;
    background: rgba(17,18,19,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between;
    max-width: 560px; margin: 0 auto;
  }

  .wl-header-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.75rem; letter-spacing: 0.06em;
    color: var(--brand); line-height: 1;
  }

  .wl-header-sub { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; letter-spacing: 0.05em; text-transform: uppercase; }

  .wl-save-btn {
    background: var(--brand); color: #111; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 0.78rem;
    padding: 8px 18px; border-radius: 999px; letter-spacing: 0.04em;
    transition: transform 0.15s, background 0.15s;
  }
  .wl-save-btn:hover { background: var(--brand-dim); transform: scale(1.04); }
  .wl-save-btn.saved { background: var(--success); color: #111; }

  .wl-body { max-width: 560px; margin: 0 auto; padding: 20px 16px 80px; display: flex; flex-direction: column; gap: 14px; }

  /* Flash */
  .wl-flash {
    position: fixed; top: 72px; left: 50%; transform: translateX(-50%);
    z-index: 50; background: var(--brand); color: #111;
    font-size: 0.78rem; font-weight: 700; padding: 10px 18px;
    border-radius: 999px; white-space: nowrap;
    display: flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 24px rgba(232,255,71,0.35);
    animation: flashIn 0.2s ease;
  }
  @keyframes flashIn { from { opacity: 0; top: 60px; } to { opacity: 1; top: 72px; } }

  /* Section card */
  .wl-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
    transition: border-color 0.2s;
  }
  .wl-card:focus-within { border-color: var(--border-active); }

  .wl-card-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.65rem; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 14px 16px 6px;
  }

  .wl-input {
    width: 100%; background: transparent; border: none;
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.92rem; font-weight: 500;
    padding: 8px 16px 14px; outline: none;
    transition: color 0.15s;
  }
  .wl-input::placeholder { color: var(--text-muted); }
  .wl-input:focus { color: #fff; }

  /* Date + Time side-by-side */
  .wl-dt-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* Divider */
  .wl-divider {
    display: flex; align-items: center; gap: 12px;
    font-size: 0.6rem; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.15em;
  }
  .wl-divider::before, .wl-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  /* Exercise card */
  .ex-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
    transition: border-color 0.2s;
  }
  .ex-card.complete { border-color: rgba(232,255,71,0.2); }
  .ex-card:focus-within { border-color: var(--border-active); }

  .ex-header {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; cursor: pointer; user-select: none;
  }

  .ex-num {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 800; flex-shrink: 0;
    background: var(--surface-3); color: var(--text-muted); border: 1px solid var(--border);
    transition: background 0.2s, color 0.2s;
  }
  .ex-card.complete .ex-num { background: var(--brand); color: #111; border-color: transparent; }

  .ex-name {
    flex: 1; font-size: 0.9rem; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: var(--text);
  }
  .ex-name.empty { color: var(--text-muted); }

  .ex-summary { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; margin-right: 4px; }

  .ex-icon-btn {
    background: none; border: none; cursor: pointer; padding: 6px;
    color: var(--text-muted); flex-shrink: 0;
    border-radius: 8px; transition: background 0.15s, color 0.15s;
  }
  .ex-icon-btn:hover { background: var(--surface-3); color: var(--text); }
  .ex-icon-btn.danger:hover { color: var(--danger); }

  .ex-chevron {
    flex-shrink: 0; color: var(--text-muted);
    transition: transform 0.2s;
  }
  .ex-chevron.open { transform: rotate(180deg); }

  /* Expanded body */
  .ex-body {
    padding: 0 14px 14px; display: flex; flex-direction: column; gap: 12px;
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }

  .ex-field-label {
    font-size: 0.6rem; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;
    display: block;
  }

  .ex-field-input {
    width: 100%; background: var(--surface-3); border: 1px solid var(--border);
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem; font-weight: 600;
    padding: 9px 10px; border-radius: 10px; outline: none;
    text-align: center;
    transition: border-color 0.15s;
  }
  .ex-field-input::placeholder { color: var(--text-muted); font-weight: 400; }
  .ex-field-input:focus { border-color: var(--brand); }

  .ex-name-input {
    width: 100%; background: var(--surface-3); border: 1px solid var(--border);
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem; font-weight: 600;
    padding: 10px 12px; border-radius: 10px; outline: none;
    transition: border-color 0.15s;
  }
  .ex-name-input::placeholder { color: var(--text-muted); font-weight: 400; }
  .ex-name-input:focus { border-color: var(--brand); }

  .ex-url-input {
    width: 100%; background: var(--surface-3); border: 1px solid var(--border);
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; padding: 9px 12px; border-radius: 10px; outline: none;
    transition: border-color 0.15s;
  }
  .ex-url-input::placeholder { color: var(--text-muted); }
  .ex-url-input:focus { border-color: var(--brand); }

  .ex-textarea {
    width: 100%; background: var(--surface-3); border: 1px solid var(--border);
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; padding: 9px 12px; border-radius: 10px; outline: none;
    resize: none; transition: border-color 0.15s;
  }
  .ex-textarea::placeholder { color: var(--text-muted); }
  .ex-textarea:focus { border-color: var(--brand); }

  .ex-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

  /* History banner */
  .ex-history-banner {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; border-radius: 10px;
    background: rgba(232,255,71,0.06); border: 1px solid rgba(232,255,71,0.2);
    font-size: 0.75rem; font-weight: 600; color: var(--brand);
    cursor: pointer; transition: background 0.15s;
  }
  .ex-history-banner:hover { background: rgba(232,255,71,0.12); }
  .ex-history-banner span { flex: 1; text-align: left; }
  .ex-history-banner .use-pill {
    background: var(--brand); color: #111; padding: 2px 8px;
    border-radius: 999px; font-size: 0.68rem; font-weight: 800; white-space: nowrap;
  }

  .ex-loaded-banner {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 10px;
    background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2);
    font-size: 0.72rem; font-weight: 600; color: var(--success);
  }

  /* ── Sets table ── */
  .sets-table {
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  /* column header row */
  .sets-table-head {
    display: grid;
    grid-template-columns: 28px 1fr 1fr 1fr 28px;
    gap: 0;
    padding: 0 10px;
    border-bottom: 1px solid var(--border);
  }
  .sets-table-head span {
    font-size: 0.58rem; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 7px 0; text-align: center;
  }
  .sets-table-head span:first-child { text-align: left; }

  /* each set row */
  .sets-row {
    display: grid;
    grid-template-columns: 28px 1fr 1fr 1fr 28px;
    gap: 0;
    padding: 5px 10px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
  }
  .sets-row:last-child { border-bottom: none; }
  .sets-row:hover { background: rgba(255,255,255,0.02); }

  .sets-row-num {
    font-size: 0.65rem; font-weight: 800; color: var(--text-muted);
    letter-spacing: 0.04em;
  }

  .sets-row-input {
    background: transparent; border: none;
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem; font-weight: 600;
    padding: 5px 6px; outline: none;
    text-align: center; width: 100%;
    border-radius: 6px;
    transition: background 0.12s, color 0.12s;
  }
  .sets-row-input::placeholder { color: rgba(107,114,128,0.6); font-weight: 400; }
  .sets-row-input:focus { background: rgba(232,255,71,0.07); color: #fff; }

  .sets-row-del {
    background: none; border: none; cursor: pointer; padding: 4px;
    color: transparent; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.12s, background 0.12s;
  }
  .sets-row:hover .sets-row-del { color: var(--text-muted); }
  .sets-row-del:hover { color: var(--danger) !important; background: rgba(255,77,77,0.1); }

  /* add set footer — below last row, centered */
  .sets-add-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 9px 12px;
    border-top: 1px dashed rgba(255,255,255,0.07);
    background: rgba(232,255,71,0.02);
  }
  .sets-add-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 700;
    color: var(--text-muted); letter-spacing: 0.05em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 8px;
    transition: color 0.12s, background 0.12s;
  }
  .sets-add-btn:hover { color: var(--brand); background: rgba(232,255,71,0.07); }

  /* Add exercise */
  .add-ex-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px; border-radius: 16px;
    border: 1px dashed rgba(255,255,255,0.15); background: transparent;
    color: var(--text-muted); font-size: 0.82rem; font-weight: 700;
    cursor: pointer; letter-spacing: 0.05em; text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .add-ex-btn:hover { color: var(--brand); border-color: rgba(232,255,71,0.35); background: rgba(232,255,71,0.04); }

  /* History panel */
  .history-card {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
  }
  .history-toggle {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 14px 16px; background: none; border: none; cursor: pointer;
    text-align: left; font-family: 'DM Sans', sans-serif;
  }
  .history-icon {
    width: 32px; height: 32px; border-radius: 10px;
    background: rgba(232,255,71,0.1); border: 1px solid rgba(232,255,71,0.2);
    display: flex; align-items: center; justify-content: center;
    color: var(--brand); flex-shrink: 0;
  }
  .history-title { font-size: 0.88rem; font-weight: 700; color: var(--text); }
  .history-sub { font-size: 0.7rem; color: var(--text-muted); margin-top: 1px; }
  .history-list { border-top: 1px solid var(--border); }
  .history-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    transition: background 0.15s;
  }
  .history-item:last-child { border-bottom: none; }
  .history-item:hover { background: var(--surface-3); }
  .history-item-info { flex: 1; min-width: 0; }
  .history-item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .history-item-label { font-size: 0.82rem; font-weight: 700; color: var(--text); }
  .history-item-date { font-size: 0.68rem; color: var(--text-muted); }
  .history-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .history-tag {
    font-size: 0.65rem; padding: 2px 8px; border-radius: 999px;
    background: var(--surface-3); border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .history-repeat-btn {
    flex-shrink: 0; display: flex; align-items: center; gap: 4px;
    padding: 6px 12px; border-radius: 8px;
    background: var(--brand); color: #111; border: none; cursor: pointer;
    font-size: 0.72rem; font-weight: 800; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s, transform 0.1s;
  }
  .history-repeat-btn:hover { background: var(--brand-dim); transform: scale(1.04); }

  /* Save */
  .wl-big-save {
    width: 100%; padding: 16px; border-radius: 16px; border: none; cursor: pointer;
    font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; letter-spacing: 0.1em;
    background: #000; color: #fff; transition: background 0.15s, transform 0.1s;
  }
  .wl-big-save:hover { background: #222; transform: scale(1.01); }
  .wl-big-save.saved { background: var(--success); color: #111; }

  /* Autocomplete dropdown */
  .ac-dropdown {
    position: absolute; z-index: 30; top: 100%; margin-top: 4px; width: 100%;
    background: var(--surface-3); border: 1px solid var(--border-active);
    border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  .ac-option {
    width: 100%; text-align: left; padding: 9px 14px;
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: var(--text);
    transition: background 0.1s, color 0.1s;
  }
  .ac-option:hover { background: rgba(232,255,71,0.1); color: var(--brand); }


`;

// ─── Mock history ────────────────────────────────────────────────────────────
const WORKOUT_HISTORY = [
  {
    id: "w1", date: "2025-03-10", label: "Mon — Push Day",
    exercises: [
      { name: "Bench Press", sets: "4", reps: "8", load: "100", notes: "Pause at bottom", videoUrl: "" },
      { name: "Overhead Press", sets: "3", reps: "10", load: "60", notes: "", videoUrl: "" },
      { name: "Incline Bench Press", sets: "3", reps: "12", load: "75", notes: "", videoUrl: "" },
      { name: "Lateral Raise", sets: "4", reps: "15", load: "12", notes: "Slow eccentric", videoUrl: "" },
      { name: "Tricep Dip", sets: "3", reps: "12", load: "", notes: "", videoUrl: "" },
    ],
  },
  {
    id: "w2", date: "2025-03-08", label: "Sat — Pull Day",
    exercises: [
      { name: "Deadlift", sets: "4", reps: "5", load: "160", notes: "Belt on last 2", videoUrl: "" },
      { name: "Pull Up", sets: "4", reps: "8", load: "", notes: "", videoUrl: "" },
      { name: "Pendlay Row", sets: "3", reps: "8", load: "90", notes: "", videoUrl: "" },
      { name: "Lat Pulldown", sets: "3", reps: "12", load: "70", notes: "", videoUrl: "" },
      { name: "Bicep Curl", sets: "3", reps: "12", load: "20", notes: "", videoUrl: "" },
    ],
  },
  {
    id: "w3", date: "2025-03-06", label: "Thu — Leg Day",
    exercises: [
      { name: "Back Squat", sets: "5", reps: "5", load: "120", notes: "High bar", videoUrl: "" },
      { name: "Romanian Deadlift", sets: "3", reps: "10", load: "90", notes: "", videoUrl: "" },
      { name: "Hip Thrust", sets: "4", reps: "12", load: "100", notes: "", videoUrl: "" },
      { name: "Bulgarian Split Squat", sets: "3", reps: "10", load: "30", notes: "", videoUrl: "" },
      { name: "Hanging Leg Raise", sets: "3", reps: "15", load: "", notes: "", videoUrl: "" },
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
  name: "", sets: "1", reps: "", load: "",
  extraSets: [], notes: "", videoUrl: "",
  expanded: true, fromHistory: false,
  ...overrides,
});

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const ChevronDown  = ({ open }) => <Icon d="M19 9l-7 7-7-7" />;
const TrashIcon    = () => <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;
const ClockIcon    = () => <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />;
const ZapIcon      = () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const CopyIcon     = () => <Icon d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />;
const PlusIcon     = () => <Icon d="M12 4v16m8-8H4" />;
const CheckIcon    = () => <Icon size={13} d="M5 13l4 4L19 7" />;
const PencilIcon   = () => <Icon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />;

// ─── Autocomplete ────────────────────────────────────────────────────────────
export function ExerciseSearch({ value, onChange, placeholder = "e.g. Bench Press" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef(null);
  const filtered = q.length > 0
    ? EXERCISE_SUGGESTIONS.filter(e => e.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => { setQ(value ?? ""); }, [value]);
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        type="text" value={q} placeholder={placeholder}
        className="ex-name-input"
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => q.length > 0 && setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="ac-dropdown">
          {filtered.map(s => (
            <button key={s} type="button" className="ac-option"
              onMouseDown={() => { setQ(s); onChange(s); setOpen(false); }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export { EXERCISE_SUGGESTIONS };

// ─── Exercise Card ───────────────────────────────────────────────────────────
function ExerciseCard({ exercise, index, onChange, onRemove, historyMatch }) {
  const isComplete = exercise.name && exercise.sets && exercise.reps;

  const applyHistory = () => {
    onChange({ ...exercise, sets: historyMatch.sets, reps: historyMatch.reps, load: historyMatch.load, notes: historyMatch.notes, fromHistory: true });
  };

  return (
    <div className={`ex-card${isComplete ? " complete" : ""}`}>
      {/* Header */}
      <div className="ex-header" onClick={() => onChange({ ...exercise, expanded: !exercise.expanded })}>
        <div className="ex-num">
          {isComplete ? <CheckIcon /> : index + 1}
        </div>
        <span className={`ex-name${exercise.name ? "" : " empty"}`}>
          {exercise.name || "New exercise"}
        </span>
        {isComplete && (
          <span className="ex-summary">
            {exercise.sets}×{exercise.reps}{exercise.load ? ` · ${exercise.load}kg` : ""}
          </span>
        )}
        <button type="button" className="ex-icon-btn"
          onClick={e => { e.stopPropagation(); onChange({ ...exercise, expanded: !exercise.expanded }); }}
          title={exercise.expanded ? "Collapse" : "Edit"}>
          <PencilIcon />
        </button>
        <button type="button" className="ex-icon-btn danger"
          onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove">
          <TrashIcon />
        </button>
        <span className={`ex-chevron${exercise.expanded ? " open" : ""}`}>
          <ChevronDown />
        </span>
      </div>

      {exercise.expanded && (
        <div className="ex-body">
          {/* History banners */}
          {historyMatch && !exercise.fromHistory && (
            <button type="button" className="ex-history-banner" onClick={applyHistory}>
              <ClockIcon />
              <span>
                Last: {historyMatch.sets}×{historyMatch.reps}
                {historyMatch.load ? ` @ ${historyMatch.load}kg` : ""}
                {historyMatch.notes ? ` — "${historyMatch.notes}"` : ""}
              </span>
              <span className="use-pill">Use →</span>
            </button>
          )}
          {exercise.fromHistory && (
            <div className="ex-loaded-banner">
              <CheckIcon /> Loaded from last session — tweak as needed
            </div>
          )}

          {/* Name */}
          <div>
            <label className="ex-field-label">Exercise</label>
            <ExerciseSearch
              value={exercise.name}
              onChange={val => onChange({ ...exercise, name: val, fromHistory: false })}
            />
          </div>

          {/* Sets table */}
          <div>
            <label className="ex-field-label">Sets</label>
            <div className="sets-table">
              {/* Column headers */}
              <div className="sets-table-head">
                <span>#</span>
                <span>Reps</span>
                <span>Load/Time</span>
                <span>Time</span>
                <span></span>
              </div>

              {/* Row 1 — primary set (always present) */}
              <div className="sets-row">
                <span className="sets-row-num">1</span>
                <input type="text" placeholder="8" value={exercise.reps}
                  className="sets-row-input" aria-label="Reps"
                  onChange={e => onChange({ ...exercise, reps: e.target.value, fromHistory: false })} />
                <input type="text" placeholder="80" value={exercise.load}
                  className="sets-row-input" aria-label="Load/Time"
                  onChange={e => onChange({ ...exercise, load: e.target.value, fromHistory: false })} />
                <input type="text" placeholder="—" value={exercise.time || ""}
                  className="sets-row-input" aria-label="Time"
                  onChange={e => onChange({ ...exercise, time: e.target.value, fromHistory: false })} />
                <span />
              </div>

              {/* Extra set rows */}
              {Array.isArray(exercise.extraSets) && exercise.extraSets.map((s, idx) => (
                <div key={idx} className="sets-row">
                  <span className="sets-row-num">{idx + 2}</span>
                  <input type="text" placeholder="8" value={s.reps || ""}
                    className="sets-row-input" aria-label={`Set ${idx + 2} reps`}
                    onChange={e => {
                      const next = [...exercise.extraSets];
                      next[idx] = { ...next[idx], reps: e.target.value };
                      onChange({ ...exercise, extraSets: next, fromHistory: false });
                    }} />
                  <input type="text" placeholder="80" value={s.load || ""}
                    className="sets-row-input" aria-label={`Set ${idx + 2} load/time`}
                    onChange={e => {
                      const next = [...exercise.extraSets];
                      next[idx] = { ...next[idx], load: e.target.value };
                      onChange({ ...exercise, extraSets: next, fromHistory: false });
                    }} />
                  <input type="text" placeholder="—" value={s.time || ""}
                    className="sets-row-input" aria-label={`Set ${idx + 2} time`}
                    onChange={e => {
                      const next = [...exercise.extraSets];
                      next[idx] = { ...next[idx], time: e.target.value };
                      onChange({ ...exercise, extraSets: next, fromHistory: false });
                    }} />
                  <button type="button" className="sets-row-del"
                    aria-label="Remove set"
                    onClick={() => {
                      const nextExtra = exercise.extraSets.filter((_, i) => i !== idx);
                      onChange({ ...exercise, extraSets: nextExtra, sets: String(1 + nextExtra.length), fromHistory: false });
                    }}>
                    <Icon d="M6 18L18 6M6 6l12 12" size={13} />
                  </button>
                </div>
              ))}

              {/* Add set footer */}
              <div className="sets-add-row">
                <button type="button" className="sets-add-btn"
                  onClick={() => {
                    const extra = Array.isArray(exercise.extraSets) ? exercise.extraSets : [];
                    const fromAbove = extra.length > 0
                      ? { reps: extra[extra.length - 1].reps ?? "", load: extra[extra.length - 1].load ?? "", time: extra[extra.length - 1].time ?? "" }
                      : { reps: exercise.reps ?? "", load: exercise.load ?? "", time: exercise.time ?? "" };
                    const nextExtra = [...extra, fromAbove];
                    onChange({ ...exercise, extraSets: nextExtra, sets: String(1 + nextExtra.length), fromHistory: false });
                  }}>
                  <PlusIcon /> Add Set
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="ex-field-label">Notes</label>
            <textarea placeholder="Cues, tempo, RPE..." rows={2} value={exercise.notes}
              className="ex-textarea"
              onChange={e => onChange({ ...exercise, notes: e.target.value })}
            />
          </div>

          {/* Video */}
          <div>
            <label className="ex-field-label">Video Link</label>
            <input type="url" placeholder="https://youtube.com/..." value={exercise.videoUrl}
              className="ex-url-input"
              onChange={e => onChange({ ...exercise, videoUrl: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Panel ───────────────────────────────────────────────────────────
function WorkoutHistoryPanel({ onRepeat }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="history-card">
      <button type="button" className="history-toggle" onClick={() => setOpen(o => !o)}>
        <div className="history-icon"><ClockIcon /></div>
        <div style={{ flex: 1 }}>
          <div className="history-title">Repeat a past workout</div>
          <div className="history-sub">Load all exercises from a previous session</div>
        </div>
        <span className={`ex-chevron${open ? " open" : ""}`} style={{ color: "var(--text-muted)" }}>
          <ChevronDown />
        </span>
      </button>
      {open && (
        <div className="history-list">
          {WORKOUT_HISTORY.map(w => (
            <div key={w.id} className="history-item">
              <div className="history-item-info">
                <div className="history-item-header">
                  <span className="history-item-label">{w.label}</span>
                  <span className="history-item-date">{w.date}</span>
                </div>
                <div className="history-tags">
                  {w.exercises.map(e => (
                    <span key={e.name} className="history-tag">{e.name}</span>
                  ))}
                </div>
              </div>
              <button type="button" className="history-repeat-btn"
                onClick={() => { onRepeat(w); setOpen(false); }}>
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

  const [date, setDate]          = useState(today);
  const [timeLocal, setTimeLocal] = useState(nowTime);
  const [exercises, setExercises] = useState(() => {
    if (initialExercises?.length > 0) {
      return initialExercises.map((e, i) => newEx({ name: e.name ?? "", sets: e.sets ?? "", reps: e.reps ?? "", load: e.load ?? "", notes: e.notes ?? "", expanded: i === 0 }));
    }
    return [newEx()];
  });
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState(null);

  const isEmbedded = !!embedded;

  const lastUsed = {};
  WORKOUT_HISTORY.forEach(w => {
    w.exercises.forEach(e => { if (!lastUsed[e.name]) lastUsed[e.name] = e; });
  });

const showFlash = msg => { setFlash(msg); setTimeout(() => setFlash(null), 3000); };
  const addExercise = () => setExercises(prev => [...prev.map(e => ({ ...e, expanded: false })), newEx()]);
  const update = (id, u) => setExercises(prev => prev.map(e => e.id === id ? u : e));
  const remove = id => setExercises(prev => prev.filter(e => e.id !== id));

  const handleSave = () => {
    if (isEmbedded && onSave) {
      const withNames = exercises.filter(e => e.name && String(e.name).trim());
      if (withNames.length === 0) { showFlash("Add at least one exercise with a name."); return; }
      onSave(withNames, editId);
    } else {
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    }
  };

  const completedCount = exercises.filter(e => e.name && e.sets && e.reps).length;

  const content = (
    <div className={isEmbedded ? "" : "wl-body"} style={isEmbedded ? { display: "flex", flexDirection: "column", gap: 14 } : {}}>
      {!isEmbedded && (
        <>
          <div className="wl-dt-row">
            <div className="wl-card">
              <div className="wl-card-label">
                <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                Date
              </div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="wl-input" />
            </div>
            <div className="wl-card">
              <div className="wl-card-label">
                <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" />
                Time
              </div>
              <input type="time" value={timeLocal} onChange={e => setTimeLocal(e.target.value)} className="wl-input" />
            </div>
          </div>

        </>
      )}

      <div className="wl-divider">Exercises</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id} exercise={ex} index={i}
            onChange={u => update(ex.id, u)}
            onRemove={() => remove(ex.id)}
            historyMatch={ex.name ? lastUsed[ex.name] : null}
          />
        ))}
      </div>

      <button type="button" className="add-ex-btn" onClick={addExercise}>
        <PlusIcon /> Add Exercise
      </button>

      {isEmbedded ? (
        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button
            type="button"
            onClick={handleSave}
            className="h-12 px-3 sm:px-6 py-0 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
            style={{ flex: 1 }}
          >
            Save to Entry
          </button>
          <a
            href="/exercise-library"
            className="h-12 px-3 sm:px-6 py-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors min-w-0 inline-flex items-center justify-center no-underline"
            style={{ flex: 1 }}
            aria-label="Open Exercise Library"
          >
            Library
          </a>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-12 px-3 sm:px-6 py-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors min-w-0"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        exercises.length >= 2 && (
          <button type="button" onClick={handleSave} className={`wl-big-save${saved ? " saved" : ""}`}>
            {saved ? "✓ Workout Saved!" : "Save Workout"}
          </button>
        )
      )}
    </div>
  );

  const wrapper = (
    <div className="wl-root">
      <style>{css}</style>
      <div className="wl-header">
        <div>
          <div className="wl-header-title">Workout Log</div>
          {completedCount > 0 && (
            <div className="wl-header-sub">{completedCount}/{exercises.length} complete</div>
          )}
        </div>
        <button type="button" onClick={handleSave} className={`wl-save-btn${saved ? " saved" : ""}`}>
          {saved ? "✓ Saved" : "Save"}
        </button>
      </div>
      {flash && (
        <div className="wl-flash"><ZapIcon /> {flash}</div>
      )}
      {content}
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="wl-embedded" style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
        <style>{css}</style>
        {flash && <div className="wl-flash" style={{ position: "static", transform: "none", marginBottom: 12 }}><ZapIcon /> {flash}</div>}
        {content}
      </div>
    );
  }

  return wrapper;
}
