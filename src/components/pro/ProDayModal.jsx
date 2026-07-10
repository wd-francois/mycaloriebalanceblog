import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import ExercisePickerModal from './ExercisePickerModal';
import { calculateSleepDuration } from '../../lib/dateUtils';
import { formatTime } from '../../lib/utils';
import AutocompleteInput from '../AutocompleteInput';
import TimePicker from '../TimePicker';
import { getCurrentTimeParts } from '../../lib/dateUtils';
import { useConvexSettings } from '../../contexts/ConvexSettingsContext';

// ── Shared token styles ────────────────────────────────────────────────────────
const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const INPUT_ERROR = 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500';
const LABEL = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';
const FIELD_ERROR = 'mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1';
const SECTION_HEADER = 'text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2';

// ── Entry type colors ─────────────────────────────────────────────────────────
const ENTRY_TYPE_COLOR = {
  meal:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  exercise:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  activity:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  sleep:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  measurements: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

// ── Pill badge ────────────────────────────────────────────────────────────────
function Pill({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Error message ─────────────────────────────────────────────────────────────
function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={FIELD_ERROR}>
      <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

const SLEEP_Q_COLOR = { Poor: 'text-red-500', Fair: 'text-yellow-500', Good: 'text-green-500', Excellent: 'text-blue-500' };

// ── Coach comments fetcher ────────────────────────────────────────────────────
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

// ── Delete confirmation inline ────────────────────────────────────────────────
function DeleteButton({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef(null);

  const handleFirst = (e) => {
    e.stopPropagation();
    setConfirm(true);
    timerRef.current = setTimeout(() => setConfirm(false), 3000);
  };
  const handleConfirm = async (e) => {
    e.stopPropagation();
    clearTimeout(timerRef.current);
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); setConfirm(false); }
  };
  const handleCancel = (e) => {
    e.stopPropagation();
    clearTimeout(timerRef.current);
    setConfirm(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (deleting) {
    return (
      <div className="flex-shrink-0 p-1.5">
        <Spinner className="w-4 h-4 text-red-400" />
      </div>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleConfirm}
          className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
          aria-label="Confirm delete"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Cancel delete"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFirst}
      title="Delete entry"
      aria-label="Delete entry"
      className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all sm:opacity-0 sm:group-hover:opacity-100"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, weightUnit: wUnit, onDelete }) {
  const weightUnit = entry.weightUnit ?? wUnit ?? 'kg';
  const lengthUnit = weightUnit === 'kg' ? 'cm' : 'in';
  let body = null;

  if (entry.type === 'meal') {
    const pills = [
      entry.calories != null && `🔥 ${entry.calories} kcal`,
      entry.protein  != null && `🥩 ${entry.protein}g`,
      entry.carbs    != null && `🍞 ${entry.carbs}g`,
      entry.fat      != null && `🥑 ${entry.fat}g`,
      entry.fibre    != null && `🌾 ${entry.fibre}g`,
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
            Set {i + 1}: {[s.load, s.reps && `${s.reps} reps`].filter(Boolean).join(' · ')}
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
        <DeleteButton onDelete={() => onDelete(entry._id)} />
      </div>
      <CoachFeedbackSection entryId={entry._id} />
    </div>
  );
}

// ── Macro input with inline unit badge ────────────────────────────────────────
function MacroInput({ id, label, value, onChange, unit, errorId }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          className={`${INPUT} pr-10`}
          value={value}
          onChange={onChange}
          placeholder="0"
          aria-describedby={errorId}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 dark:text-gray-500 pointer-events-none select-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ── Meal Form ──────────────────────────────────────────────────────────────────
function MealForm({ dateStr, onSave, onCancel }) {
  const uid = useId();
  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [meal, setMeal]         = useState(1);
  const [cal, setCal]           = useState('');
  const [protein, setProtein]   = useState('');
  const [carbs, setCarbs]       = useState('');
  const [fat, setFat]           = useState('');
  const [fibre, setFibre]       = useState('');
  const [other, setOther]       = useState('');
  const [notes, setNotes]       = useState('');
  const [time, setTime]         = useState(() => getCurrentTimeParts());
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const MEAL_LABELS = ['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Evening'];

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Meal name is required';
    if (cal && (isNaN(Number(cal)) || Number(cal) < 0)) e.cal = 'Must be a positive number';
    if (protein && (isNaN(Number(protein)) || Number(protein) < 0)) e.protein = 'Must be a positive number';
    if (carbs && (isNaN(Number(carbs)) || Number(carbs) < 0)) e.carbs = 'Must be a positive number';
    if (fat && (isNaN(Number(fat)) || Number(fat) < 0)) e.fat = 'Must be a positive number';
    return e;
  };

  const handleAutocompleteSelect = (item) => {
    if (!item) return;
    if (item.name)     setName(item.name);
    if (item.amount)   setAmount(item.amount);
    if (item.calories) setCal(String(item.calories));
    if (item.protein)  setProtein(String(item.protein));
    if (item.carbs)    setCarbs(String(item.carbs));
    if (item.fats)     setFat(String(item.fats));
    if (item.fibre)    setFibre(String(item.fibre));
    if (item.other)    setOther(String(item.other));
    setErrors({});
  };

  const totalCalFromMacros = (() => {
    const p = Number(protein) || 0;
    const c = Number(carbs)   || 0;
    const f = Number(fat)     || 0;
    return p > 0 || c > 0 || f > 0 ? Math.round(p * 4 + c * 4 + f * 9) : null;
  })();

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        type: 'meal', date: dateStr, time,
        name:       name.trim(),
        amount:     amount    || undefined,
        mealNumber: meal,
        calories:   cal     ? Number(cal)     : undefined,
        protein:    protein ? Number(protein) : undefined,
        carbs:      carbs   ? Number(carbs)   : undefined,
        fat:        fat     ? Number(fat)     : undefined,
        fibre:      fibre   ? Number(fibre)   : undefined,
        other:      other.trim() || undefined,
        notes:      notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-label="Add meal entry">
      <div>
        <label className={LABEL}>Time</label>
        <TimePicker value={time} onChange={setTime} />
      </div>

      <div>
        <label htmlFor={`${uid}-name`} className={LABEL}>
          Meal Name <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
        </label>
        <AutocompleteInput
          id={`${uid}-name`}
          type="food"
          value={name}
          onChange={(v) => { setName(v); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
          onSelect={handleAutocompleteSelect}
          placeholder="e.g. Oatmeal, Chicken salad…"
          autoFocus
          aria-required="true"
          aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          className={errors.name ? INPUT_ERROR : ''}
        />
        <FieldError id={`${uid}-name-err`} message={errors.name} />
      </div>

      <div>
        <label htmlFor={`${uid}-amount`} className={LABEL}>Amount / Serving Size</label>
        <input
          id={`${uid}-amount`}
          className={INPUT}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="e.g. 1 cup, 200g, 2 slices…"
        />
      </div>

      <fieldset>
        <legend className={LABEL}>Meal Slot</legend>
        <div className="flex gap-1.5 flex-wrap mt-1">
          {MEAL_LABELS.map((lbl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMeal(i + 1)}
              aria-pressed={meal === i + 1}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 ${
                meal === i + 1
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className={SECTION_HEADER}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          Nutrition
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <MacroInput id={`${uid}-cal`} label="Calories" value={cal} onChange={e => { setCal(e.target.value); if (errors.cal) setErrors(p => ({ ...p, cal: '' })); }} unit="kcal" errorId={errors.cal ? `${uid}-cal-err` : undefined} />
            <FieldError id={`${uid}-cal-err`} message={errors.cal} />
            {totalCalFromMacros != null && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                ≈ {totalCalFromMacros} kcal from macros below
              </p>
            )}
          </div>
          <div>
            <MacroInput id={`${uid}-protein`} label="Protein" value={protein} onChange={e => setProtein(e.target.value)} unit="g" />
          </div>
          <div>
            <MacroInput id={`${uid}-carbs`} label="Carbs" value={carbs} onChange={e => setCarbs(e.target.value)} unit="g" />
          </div>
          <div>
            <MacroInput id={`${uid}-fat`} label="Fats" value={fat} onChange={e => setFat(e.target.value)} unit="g" />
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          aria-expanded={showAdvanced}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Advanced (fibre, other nutrients)
        </button>
        {showAdvanced && (
          <div className="mt-3 flex flex-col gap-3 pl-1 border-l-2 border-gray-100 dark:border-gray-800">
            <MacroInput id={`${uid}-fibre`} label="Fibre" value={fibre} onChange={e => setFibre(e.target.value)} unit="g" />
            <div>
              <label htmlFor={`${uid}-other`} className={LABEL}>Other Nutrients</label>
              <input
                id={`${uid}-other`}
                type="text"
                className={INPUT}
                value={other}
                onChange={e => setOther(e.target.value)}
                placeholder="e.g. Sodium 200mg, Sugar 5g…"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-notes`} className={LABEL}>Notes</label>
        <textarea
          id={`${uid}-notes`}
          rows={2}
          className={INPUT + ' resize-none'}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any extra context…"
          maxLength={500}
        />
        {notes.length > 400 && (
          <p className="mt-0.5 text-right text-xs text-gray-400">{notes.length}/500</p>
        )}
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Add Meal Entry" saving={saving} />
    </form>
  );
}

// ── Exercise builder ───────────────────────────────────────────────────────────
const emptyExercise = () => ({
  id: Date.now() + Math.random(),
  name: '', load: '', reps: '', extraSets: [], notes: '', videoUrls: [], expanded: true,
});

function normaliseEx(e) {
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

const SET_INPUT = 'w-full bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

function ExerciseCard({ ex, index, onChange, onRemove }) {
  const [showPicker, setShowPicker] = useState(false);
  const totalSets = 1 + (ex.extraSets?.length ?? 0);
  const done = !!(ex.name && (ex.reps || ex.load));

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
    <div className={`rounded-xl border transition-all ${done ? 'border-blue-400/40 dark:border-blue-600/30' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-[var(--color-bg-muted)]`}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => onChange({ ...ex, expanded: !ex.expanded })}
        role="button"
        aria-expanded={ex.expanded}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onChange({ ...ex, expanded: !ex.expanded })}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
          {done
            ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : index + 1}
        </div>
        <span className={`flex-1 text-sm font-semibold truncate min-w-0 ${ex.name ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          {ex.name || 'New exercise'}
        </span>
        <span className="text-xs text-gray-400 shrink-0 mr-1 hidden sm:block tabular-nums">
          {totalSets} set{totalSets !== 1 ? 's' : ''}{done && (ex.load || ex.reps) ? ` · ${ex.load || '—'} · ${ex.reps || '—'} reps` : ''}
        </span>
        {videoLinks.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="View exercise video"
            aria-label="View exercise video"
            className="p-1.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </a>
        ))}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove exercise ${index + 1}`}
          className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
        >
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

          {/* Exercise name */}
          <div>
            <label className={LABEL}>Exercise</label>
            <div className="flex gap-2">
              <input
                className={INPUT}
                value={ex.name}
                placeholder="e.g. Bench Press"
                onChange={e => onChange({ ...ex, name: e.target.value })}
                aria-label="Exercise name"
              />
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                title="Browse exercise database"
                aria-label="Browse exercise database"
                className="flex-shrink-0 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
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
              <img src={(ex.videoUrls ?? []).find(u => u.endsWith('.gif'))} alt={ex.name || 'Exercise demo'} className="w-full max-h-52 object-contain" />
            </div>
          )}

          {/* Video links */}
          {videoLinks.map((url, i, arr) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              <span className="text-xs font-semibold truncate">
                Video{arr.length > 1 ? ` ${i + 1}` : ''}
              </span>
            </a>
          ))}

          {/* Sets table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-white/[0.04] overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-[10px] font-bold text-gray-400 uppercase text-center">#</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Load</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Reps</span>
              <span />
            </div>
            <div className="p-3 flex flex-col gap-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center tabular-nums">1</span>
                <input className={SET_INPUT} value={ex.load} placeholder="—" aria-label="Set 1 load"
                  onChange={e => onChange({ ...ex, load: e.target.value, extraSets: syncExtras('load', e.target.value) })} />
                <input className={SET_INPUT} value={ex.reps} placeholder="—" aria-label="Set 1 reps"
                  onChange={e => onChange({ ...ex, reps: e.target.value, extraSets: syncExtras('reps', e.target.value) })} />
                <div className="flex justify-center">
                  {totalSets > 1 && (
                    <button type="button" onClick={() => removeSet(0)} aria-label="Remove set 1" className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
              {(ex.extraSets ?? []).map((s, i) => (
                <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center tabular-nums">{i + 2}</span>
                  <input className={SET_INPUT} value={s.load || ''} placeholder="—" aria-label={`Set ${i + 2} load`}
                    onChange={e => onChange({ ...ex, extraSets: ex.extraSets.map((x, j) => j === i ? { ...x, load: e.target.value } : x) })} />
                  <input className={SET_INPUT} value={s.reps || ''} placeholder="—" aria-label={`Set ${i + 2} reps`}
                    onChange={e => onChange({ ...ex, extraSets: ex.extraSets.map((x, j) => j === i ? { ...x, reps: e.target.value } : x) })} />
                  <div className="flex justify-center">
                    <button type="button" onClick={() => removeSet(i + 1)} aria-label={`Remove set ${i + 2}`} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-center pt-1">
                <button type="button" onClick={addSet}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Set
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes</label>
            <textarea rows={2} className={INPUT + ' resize-none'} value={ex.notes} placeholder="Cues, tempo, bands…"
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

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Load coach program"
    >
      <div className="w-full max-w-sm bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Load Coach Program</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {programs.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No programs yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Ask your coach to assign a program.</p>
            </div>
          ) : programs.map(p => {
            let exercises = [];
            try { exercises = JSON.parse(p.exercises); } catch {}
            return (
              <button key={p._id} type="button" onClick={() => onSelect(p)}
                className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-[var(--color-bg-subtle)] hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p>
                {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {p.coachName}
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
function ExerciseFormWrapper({ dateStr, onSave, onCancel }) {
  const [time]                      = useState(() => getCurrentTimeParts());
  const [exercises, setExercises]   = useState([emptyExercise()]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);

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

  const canSave = exercises.some(e => e.name.trim());

  const handleSave = async () => {
    const named = exercises.filter(e => e.name.trim());
    if (named.length === 0) return;
    setSaving(true);
    try {
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
      await onSave(entries);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showPicker && <CoachProgramPicker onSelect={loadProgram} onClose={() => setShowPicker(false)} />}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {exercises.reduce((n, e) => n + 1 + (e.extraSets?.length ?? 0), 0)} sets
        </p>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Load program
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

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button type="button" onClick={addEx}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-all text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Exercise
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {saving ? <><Spinner className="w-4 h-4" /> Saving…</> : 'Save Workout'}
        </button>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full mt-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Cancel
      </button>
    </>
  );
}

// ── Sleep Form ─────────────────────────────────────────────────────────────────
const defaultBedtime  = { hour: 10, minute: 0, period: 'PM' };
const defaultWaketime = { hour: 6,  minute: 0, period: 'AM' };

const SLEEP_QUALITIES = [
  { id: 'Poor',      emoji: '😫', color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-500',    ring: 'ring-red-400' },
  { id: 'Fair',      emoji: '😐', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', ring: 'ring-yellow-400' },
  { id: 'Good',      emoji: '😊', color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-500',  ring: 'ring-green-400' },
  { id: 'Excellent', emoji: '⭐', color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-500',   ring: 'ring-blue-400' },
];

function TimeSelect({ value, onChange, label }) {
  const uid = useId();
  return (
    <fieldset
      aria-label={label}
      className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-xl"
    >
      <div className="flex flex-col items-center">
        <label htmlFor={`${uid}-hour`} className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hour</label>
        <select
          id={`${uid}-hour`}
          className="w-16 px-2 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          value={value.hour}
          onChange={e => onChange({ ...value, hour: Number(e.target.value) })}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <span className="text-gray-300 dark:text-gray-600 text-xl font-bold mt-4">:</span>
      <div className="flex flex-col items-center">
        <label htmlFor={`${uid}-min`} className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min</label>
        <select
          id={`${uid}-min`}
          className="w-16 px-2 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          value={value.minute}
          onChange={e => onChange({ ...value, minute: Number(e.target.value) })}
        >
          {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
        </select>
      </div>
      <div className="flex flex-col items-center">
        <label htmlFor={`${uid}-period`} className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">AM/PM</label>
        <select
          id={`${uid}-period`}
          className="w-16 px-2 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          value={value.period}
          onChange={e => onChange({ ...value, period: e.target.value })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </fieldset>
  );
}

function SleepForm({ dateStr, onSave, onCancel }) {
  const uid = useId();
  const [bedtime,  setBedtime]  = useState(defaultBedtime);
  const [waketime, setWaketime] = useState(defaultWaketime);
  const [quality,  setQuality]  = useState('Good');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const durationStr = calculateSleepDuration(bedtime, waketime);

  function parseDuration(str) {
    const h = str.match(/(\d+)h/);
    const m = str.match(/(\d+)m/);
    return (h ? parseInt(h[1]) : 0) + (m ? parseInt(m[1]) / 60 : 0);
  }

  const hours = parseDuration(durationStr);
  const durationColor =
    hours < 5  ? 'text-red-600 dark:text-red-400' :
    hours < 7  ? 'text-yellow-600 dark:text-yellow-400' :
    hours <= 9 ? 'text-green-600 dark:text-green-400' :
                 'text-blue-600 dark:text-blue-400';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        type: 'sleep', date: dateStr,
        bedtime, waketime,
        sleepStart:    formatTime(bedtime),
        sleepEnd:      formatTime(waketime),
        sleepDuration: parseDuration(durationStr),
        sleepQuality:  quality,
        notes:         notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-label="Add sleep entry">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className={LABEL}>Bedtime</p>
          <TimeSelect value={bedtime} onChange={setBedtime} label="Bedtime" />
        </div>
        <div>
          <p className={LABEL}>Wake Time</p>
          <TimeSelect value={waketime} onChange={setWaketime} label="Wake time" />
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl px-4 py-4 text-center border border-purple-100 dark:border-purple-800/40">
        <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest mb-1">Total Sleep</p>
        <p className={`text-3xl font-bold tabular-nums ${durationColor}`} aria-live="polite">{durationStr}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTime(bedtime)} → {formatTime(waketime)}</p>
        {hours < 7 && hours > 0 && (
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Aim for 7–9 hours for optimal recovery
          </p>
        )}
      </div>

      <fieldset>
        <legend className={LABEL}>Sleep Quality</legend>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {SLEEP_QUALITIES.map(q => (
            <button
              key={q.id}
              type="button"
              onClick={() => setQuality(q.id)}
              aria-pressed={quality === q.id}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${q.ring} ${
                quality === q.id
                  ? `${q.bg} text-white shadow-sm scale-[1.03]`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{q.emoji}</span>
              {q.id}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${uid}-notes`} className={LABEL}>Notes</label>
        <textarea
          id={`${uid}-notes`}
          rows={2}
          className={INPUT + ' resize-none'}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What affected your sleep?"
        />
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Add Sleep Entry" saving={saving} />
    </form>
  );
}

// ── Measurement field ─────────────────────────────────────────────────────────
function MeasurementField({ id, label, value, onChange, suffix }) {
  return (
    <div>
      {label && <label htmlFor={id} className={LABEL}>{label}</label>}
      <div className="flex gap-1.5">
        <input
          id={id}
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          className={INPUT + ' flex-1'}
          value={value}
          onChange={onChange}
          placeholder="—"
          aria-label={label ? `${label} in ${suffix}` : suffix}
        />
        <div className="flex items-center justify-center px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-subtle)] text-gray-400 dark:text-gray-500 text-xs font-bold flex-shrink-0 min-w-[2.75rem] text-center">
          {suffix}
        </div>
      </div>
    </div>
  );
}

// ── Measurements Form ──────────────────────────────────────────────────────────
function MeasurementsForm({ dateStr, weightUnit: initialWeightUnit = 'kg', onSave, onCancel }) {
  const uid = useId();
  const [time]      = useState(() => getCurrentTimeParts());
  const [unit, setUnit] = useState(initialWeightUnit);
  const [form, setForm] = useState({
    weight: '', neck: '', shoulders: '', chest: '', waist: '', hips: '',
    thigh: '', arm: '', calf: '',
    chestSkinfold: '', abdominalSkinfold: '', thighSkinfold: '',
    tricepSkinfold: '', subscapularSkinfold: '', suprailiacSkinfold: '',
    notes: '',
  });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [showSkinfolds, setShowSkinfolds] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const num = (val) => val ? Number(val) : undefined;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.weight) errs.weight = 'Weight is required';
    if (form.weight && (isNaN(Number(form.weight)) || Number(form.weight) <= 0)) errs.weight = 'Enter a valid weight';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        type: 'measurements', date: dateStr, time,
        weight: num(form.weight), weightUnit: unit,
        neck:      num(form.neck),
        shoulders: num(form.shoulders),
        chest:     num(form.chest),
        waist:     num(form.waist),
        hips:      num(form.hips),
        thigh:     num(form.thigh),
        arm:       num(form.arm),
        calf:      num(form.calf),
        chestSkinfold:       num(form.chestSkinfold),
        abdominalSkinfold:   num(form.abdominalSkinfold),
        thighSkinfold:       num(form.thighSkinfold),
        tricepSkinfold:      num(form.tricepSkinfold),
        subscapularSkinfold: num(form.subscapularSkinfold),
        suprailiacSkinfold:  num(form.suprailiacSkinfold),
        notes: form.notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const lengthUnit = unit === 'kg' ? 'cm' : 'in';
  const F = (fkey, suffix) => ({
    id: `${uid}-${fkey}`,
    value: form[fkey],
    onChange: set(fkey),
    suffix,
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-label="Add measurements">
      <div>
        <div className="flex items-end justify-between mb-1">
          <label htmlFor={`${uid}-weight`} className={LABEL}>
            Body Weight <span className="text-red-400" aria-hidden="true">*</span>
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs font-semibold">
            {['kg', 'lbs'].map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`px-2.5 py-1 transition-colors ${unit === u ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[var(--color-bg-subtle)] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <input
            id={`${uid}-weight`}
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            className={`${INPUT} text-lg font-bold pr-14 ${errors.weight ? INPUT_ERROR : ''}`}
            value={form.weight}
            onChange={e => { set('weight')(e); if (errors.weight) setErrors(p => ({ ...p, weight: '' })); }}
            placeholder="0.0"
            aria-required="true"
            aria-describedby={errors.weight ? `${uid}-weight-err` : undefined}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">{unit}</span>
        </div>
        <FieldError id={`${uid}-weight-err`} message={errors.weight} />
      </div>

      <div>
        <p className={SECTION_HEADER}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          Girth Measurements
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MeasurementField label="Neck"      {...F('neck',      lengthUnit)} />
          <MeasurementField label="Shoulders" {...F('shoulders', lengthUnit)} />
          <MeasurementField label="Chest"     {...F('chest',     lengthUnit)} />
          <MeasurementField label="Waist"     {...F('waist',     lengthUnit)} />
          <MeasurementField label="Hips"      {...F('hips',      lengthUnit)} />
          <MeasurementField label="Thigh"     {...F('thigh',     lengthUnit)} />
          <MeasurementField label="Arm"       {...F('arm',       lengthUnit)} />
          <MeasurementField label="Calf"      {...F('calf',      lengthUnit)} />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowSkinfolds(v => !v)}
          aria-expanded={showSkinfolds}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showSkinfolds ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Skinfold Measurements
        </button>
        {showSkinfolds && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MeasurementField label="Chest"       {...F('chestSkinfold',       'mm')} />
            <MeasurementField label="Abdominal"   {...F('abdominalSkinfold',   'mm')} />
            <MeasurementField label="Thigh"       {...F('thighSkinfold',       'mm')} />
            <MeasurementField label="Tricep"      {...F('tricepSkinfold',      'mm')} />
            <MeasurementField label="Subscapular" {...F('subscapularSkinfold', 'mm')} />
            <MeasurementField label="Suprailiac"  {...F('suprailiacSkinfold',  'mm')} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`${uid}-notes`} className={LABEL}>Notes</label>
        <textarea
          id={`${uid}-notes`}
          rows={2}
          className={INPUT + ' resize-none'}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Conditions, time of day…"
        />
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Save Measurements" saving={saving} />
    </form>
  );
}

// ── Shared form buttons ────────────────────────────────────────────────────────
function FormButtons({ onCancel, submitLabel = 'Save', saving = false }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {saving ? <><Spinner className="w-4 h-4" /><span>Saving…</span></> : submitLabel}
      </button>
    </div>
  );
}

// ── Photo attachment ──────────────────────────────────────────────────────────
function PhotoAttach({ file, setFile }) {
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const remove = () => {
    setFile(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const DASHED_BTN = 'flex flex-col items-center justify-center gap-2 flex-1 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="w-full">
      <p className={SECTION_HEADER}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        Photo <span className="normal-case font-normal text-gray-400">(optional)</span>
      </p>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={preview} alt="Photo preview" className="w-full h-44 object-cover" />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Remove photo"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button type="button" onClick={() => cameraRef.current?.click()} className={DASHED_BTN} aria-label="Take a photo">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-xs font-medium">Camera</span>
          </button>
          <button type="button" onClick={() => uploadRef.current?.click()} className={DASHED_BTN} aria-label="Upload a photo">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="text-xs font-medium">Upload</span>
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} aria-hidden="true" />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleChange} aria-hidden="true" />
    </div>
  );
}

// ── Type button config ─────────────────────────────────────────────────────────
const TYPE_BTNS = [
  { id: 'meal',         emoji: '🍽️', label: 'Meal',     desc: 'Log food & macros',   activeColor: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' },
  { id: 'exercise',     emoji: '🏋️', label: 'Exercise', desc: 'Track sets & reps',   activeColor: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { id: 'sleep',        emoji: '🛌', label: 'Sleep',    desc: 'Record rest quality', activeColor: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' },
  { id: 'measurements', emoji: '📏', label: 'Measure',  desc: 'Body stats & girths', activeColor: 'border-teal-400 bg-teal-50 dark:bg-teal-900/20' },
];

function formatDateLabel(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Modal ──────────────────────────────────────────────────────────────────────
export default function ProDayModal({ date, dateStr, entries, onClose }) {
  const [mode, setMode]             = useState('add');
  const [activeType, setActiveType] = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const addEntry          = useMutation(api.entries.add);
  const deleteEntry       = useMutation(api.entries.remove);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto         = useMutation(api.photos.save);
  const { settings } = useConvexSettings();

  const isFormActive = !!activeType;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (activeType) setActiveType(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeType, onClose]);

  const handleTypeSelect = (id) => {
    setActiveType(id);
    setPhotoFile(null);
  };

  const uploadPhoto = async () => {
    if (!photoFile) return undefined;
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': photoFile.type },
      body: photoFile,
    });
    if (!res.ok) return undefined;
    const { storageId } = await res.json();
    return await savePhoto({ storageId, date: dateStr });
  };

  const handleSave = async (dataOrArray) => {
    const photoId = await uploadPhoto();
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    for (const item of items) {
      await addEntry({ ...item, photoId });
    }
    setPhotoFile(null);
    setActiveType(null);
  };

  const handleSavePhotoOnly = async () => {
    if (!photoFile) return;
    setSavingPhoto(true);
    try {
      await uploadPhoto();
      setPhotoFile(null);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleDelete = (id) => deleteEntry({ id });

  const renderForm = () => {
    if (!activeType) return null;
    const props = { dateStr, onSave: handleSave, onCancel: () => setActiveType(null) };
    switch (activeType) {
      case 'meal':         return <MealForm         {...props} />;
      case 'exercise':     return <ExerciseFormWrapper {...props} />;
      case 'sleep':        return <SleepForm        {...props} />;
      case 'measurements': return <MeasurementsForm {...props} weightUnit={settings?.weightUnit ?? 'kg'} />;
      default:             return null;
    }
  };

  const activeBtn = TYPE_BTNS.find(t => t.id === activeType);

  // ── View Entries ─────────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div
        className="fixed inset-0 z-50 w-full h-full bg-white dark:bg-[var(--color-bg-base)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Entries for ${formatDateLabel(date)}`}
        style={{ paddingTop: '80px', paddingBottom: '80px' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setMode('add')}
            aria-label="Back to add entry"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{formatDateLabel(date)}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-lg mx-auto px-4 py-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nothing logged yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Start tracking to see your entries here.</p>
                </div>
                <button
                  onClick={() => setMode('add')}
                  className="mt-1 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add first entry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {entries.map(entry => (
                  <EntryCard key={entry._id} entry={entry} weightUnit={settings?.weightUnit ?? 'kg'} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </div>

        {entries.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setMode('add')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add New Entry
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Add Entry ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[var(--color-bg-base)] dark:via-[var(--color-bg-base)] dark:to-[var(--color-bg-base)] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Add new entry"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div
        className="flex-1 overflow-y-auto min-h-0 py-6"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className={`max-w-xl mx-auto px-4 w-full ${!isFormActive ? 'min-h-full flex flex-col justify-center' : ''}`}>

          {/* ── Type selection ───────────────────────────────────────────── */}
          {!isFormActive && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatDateLabel(date)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">What would you like to log?</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TYPE_BTNS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeSelect(t.id)}
                    className="group relative flex flex-col items-start gap-3 p-4 rounded-2xl bg-white dark:bg-[var(--color-bg-muted)] border-2 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md active:scale-[0.97] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-150">
                      {t.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{t.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">
                <PhotoAttach file={photoFile} setFile={setPhotoFile} />
                <button
                  type="button"
                  onClick={handleSavePhotoOnly}
                  disabled={!photoFile || savingPhoto}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {savingPhoto ? <><Spinner className="w-4 h-4" /><span>Saving…</span></> : 'Save Photo'}
                </button>
              </div>

              <button
                onClick={() => setMode('view')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-[var(--color-bg-muted)] border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Today's Entries
                </span>
                <span className="flex items-center gap-2">
                  {entries.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                      {entries.length}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          )}

          {/* ── Active form ──────────────────────────────────────────────── */}
          {isFormActive && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveType(null)}
                  aria-label="Back"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-xl" aria-hidden="true">{activeBtn?.emoji}</span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{activeBtn?.label}</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{activeBtn?.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                {renderForm()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
