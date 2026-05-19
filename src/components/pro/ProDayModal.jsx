import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { calculateSleepDuration } from '../../lib/dateUtils';
import { formatTime } from '../../lib/utils';
import AutocompleteInput from '../AutocompleteInput';
import ExerciseForm from '../ExerciseForm';
import TimePicker from '../TimePicker';
import { getCurrentTimeParts } from '../../lib/dateUtils';
import { useConvexSettings } from '../../contexts/ConvexSettingsContext';

// ── Shared styles ──────────────────────────────────────────────────────────────
const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const LABEL = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';

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
function EntryCard({ entry, weightUnit: wUnit, onDelete }) {
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
            Set {i + 1}: {[s.load && `${s.load}`, s.reps && `${s.reps} reps`].filter(Boolean).join(' · ')}
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

// ── Meal Form ──────────────────────────────────────────────────────────────────
function MealForm({ dateStr, onSave, onCancel }) {
  const [name, setName]       = useState('');
  const [amount, setAmount]   = useState('');
  const [meal, setMeal]       = useState(1);
  const [cal, setCal]         = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs]     = useState('');
  const [fat, setFat]         = useState('');
  const [fibre, setFibre]     = useState('');
  const [other, setOther]     = useState('');
  const [notes, setNotes]     = useState('');
  const [time, setTime]       = useState(() => getCurrentTimeParts());

  const MEAL_LABELS = ['Breakfast', 'Snack', 'Lunch', 'Snack', 'Dinner', 'Snack'];

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
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      type: 'meal', date: dateStr, time,
      name:      name.trim(),
      amount:    amount    || undefined,
      mealNumber: meal,
      calories:  cal     ? Number(cal)     : undefined,
      protein:   protein ? Number(protein) : undefined,
      carbs:     carbs   ? Number(carbs)   : undefined,
      fat:       fat     ? Number(fat)     : undefined,
      fibre:     fibre   ? Number(fibre)   : undefined,
      other:     other.trim() || undefined,
      notes:     notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Time</label>
        <TimePicker value={time} onChange={setTime} />
      </div>

      <div>
        <label className={LABEL}>Meal Name</label>
        <AutocompleteInput
          type="food"
          value={name}
          onChange={setName}
          onSelect={handleAutocompleteSelect}
          placeholder="e.g. Oatmeal, Chicken salad…"
          autoFocus
        />
      </div>

      <div>
        <label className={LABEL}>Amount</label>
        <input className={INPUT} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1 cup, 200g…" />
      </div>

      <div>
        <label className={LABEL}>Meal</label>
        <div className="flex gap-1.5 flex-wrap">
          {MEAL_LABELS.map((lbl, i) => (
            <button key={i} type="button" onClick={() => setMeal(i + 1)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${meal === i + 1 ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {i + 1}. {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ['Calories',   cal,     setCal,    'number'],
          ['Protein (g)', protein, setProtein, 'number'],
          ['Carbs (g)',   carbs,   setCarbs,   'number'],
          ['Fats (g)',    fat,     setFat,     'number'],
          ['Fibre (g)',   fibre,   setFibre,   'number'],
        ].map(([lbl, val, set, type]) => (
          <div key={lbl}>
            <label className={LABEL}>{lbl}</label>
            <input type={type} min="0" className={INPUT} value={val} onChange={e => set(e.target.value)} placeholder="—" />
          </div>
        ))}
      </div>

      <div>
        <label className={LABEL}>Other Nutrients</label>
        <input
          type="text"
          className={INPUT}
          value={other}
          onChange={e => setOther(e.target.value)}
          placeholder="e.g. Sodium 200mg, Sugar 5g, Cholesterol 30mg…"
        />
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Add Meal Entry" />
    </form>
  );
}

// ── Exercise Form ──────────────────────────────────────────────────────────────
function ExerciseFormWrapper({ dateStr, onSave, onCancel }) {
  const [time] = useState(() => getCurrentTimeParts());

  const handleExerciseSave = (exercises, saveMeta) => {
    const date = dateStr;
    const named = (exercises || []).filter(e => e.name && String(e.name).trim());
    const activities = Array.isArray(saveMeta?.activities)
      ? saveMeta.activities.filter(a => a.name && String(a.name).trim())
      : [];

    const entries = [];

    for (const e of named) {
      const sets = [{ reps: e.reps || '', load: e.load || '' }];
      if (Array.isArray(e.extraSets)) {
        for (const s of e.extraSets) {
          if (s && (s.reps || s.load)) sets.push({ reps: s.reps || '', load: s.load || '' });
        }
      }
      entries.push({
        type: 'exercise', date, time,
        name: String(e.name).trim(),
        exercisesData: JSON.stringify(sets),
        notes: (e.notes && String(e.notes).trim()) || undefined,
      });
    }

    for (const a of activities) {
      entries.push({
        type: 'activity', date, time,
        name: String(a.name).trim(),
        durationMinutes: a.duration ? String(a.duration) : undefined,
        distance:        a.distance ? String(a.distance) : undefined,
        steps:           a.steps    ? String(a.steps)    : undefined,
        notes:           (a.notes && String(a.notes).trim()) || undefined,
      });
    }

    onSave(entries);
  };

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  return (
    <ExerciseForm
      embedded
      selectedDate={dateObj}
      time={time}
      onSave={handleExerciseSave}
      onCancel={onCancel}
    />
  );
}

// ── Sleep Form ─────────────────────────────────────────────────────────────────
const defaultBedtime  = { hour: 10, minute: 0, period: 'PM' };
const defaultWaketime = { hour: 6,  minute: 0, period: 'AM' };

function TimeSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-bg-subtle)] border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hour</label>
        <select
          className="w-16 px-2 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
          value={value.hour} onChange={e => onChange({ ...value, hour: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <span className="text-gray-400 text-xl font-bold">:</span>
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Minute</label>
        <select
          className="w-16 px-2 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
          value={value.minute} onChange={e => onChange({ ...value, minute: Number(e.target.value) })}>
          {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
        </select>
      </div>
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Period</label>
        <select
          className="w-16 px-2 py-2 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
          value={value.period} onChange={e => onChange({ ...value, period: e.target.value })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function SleepForm({ dateStr, onSave, onCancel }) {
  const [bedtime,  setBedtime]  = useState(defaultBedtime);
  const [waketime, setWaketime] = useState(defaultWaketime);
  const [quality,  setQuality]  = useState('Good');
  const [notes,    setNotes]    = useState('');

  const durationStr = calculateSleepDuration(bedtime, waketime);

  function parseDuration(str) {
    const h = str.match(/(\d+)h/);
    const m = str.match(/(\d+)m/);
    return (h ? parseInt(h[1]) : 0) + (m ? parseInt(m[1]) / 60 : 0);
  }

  const QUALITIES = ['Poor', 'Fair', 'Good', 'Excellent'];
  const Q_COLOR   = { Poor: 'bg-red-500', Fair: 'bg-yellow-500', Good: 'bg-green-500', Excellent: 'bg-blue-500' };

  const submit = (e) => {
    e.preventDefault();
    onSave({
      type: 'sleep', date: dateStr,
      bedtime, waketime,
      sleepStart:    formatTime(bedtime),
      sleepEnd:      formatTime(waketime),
      sleepDuration: parseDuration(durationStr),
      sleepQuality:  quality,
      notes:         notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Bedtime</label>
          <TimeSelect value={bedtime} onChange={setBedtime} />
        </div>
        <div>
          <label className={LABEL}>Wake Time</label>
          <TimeSelect value={waketime} onChange={setWaketime} />
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-purple-500 dark:text-purple-400 font-medium uppercase tracking-wide mb-0.5">Total Sleep Duration</p>
        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{durationStr}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatTime(bedtime)} → {formatTime(waketime)}</p>
      </div>

      <div>
        <label className={LABEL}>Sleep Quality</label>
        <div className="flex gap-2">
          {QUALITIES.map(q => (
            <button key={q} type="button" onClick={() => setQuality(q)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${quality === q ? Q_COLOR[q] + ' text-white ring-2 ring-offset-1 ring-current' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Add Sleep Entry" />
    </form>
  );
}

// ── Measurement field (must be outside MeasurementsForm to avoid remount-on-type) ──
function MeasurementField({ label, value, onChange, suffix }) {
  return (
    <div>
      {label && <label className={LABEL}>{label}</label>}
      <div className="flex gap-2">
        <input
          type="number" step="0.1" min="0"
          className={INPUT + ' flex-1'}
          value={value}
          onChange={onChange}
          placeholder="0.0"
        />
        <div className="flex items-center justify-center px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-subtle)] text-gray-500 dark:text-gray-400 text-sm font-semibold flex-shrink-0">
          {suffix}
        </div>
      </div>
    </div>
  );
}

// ── Measurements Form ──────────────────────────────────────────────────────────
function MeasurementsForm({ dateStr, weightUnit: initialWeightUnit = 'kg', onSave, onCancel }) {
  const [time]      = useState(() => getCurrentTimeParts());
  const [unit, setUnit] = useState(initialWeightUnit);
  const [form, setForm] = useState({
    weight: '', neck: '', shoulders: '', chest: '', waist: '', hips: '',
    thigh: '', arm: '', calf: '',
    chestSkinfold: '', abdominalSkinfold: '', thighSkinfold: '',
    tricepSkinfold: '', subscapularSkinfold: '', suprailiacSkinfold: '',
    notes: '',
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const num = (val) => val ? Number(val) : undefined;

  const submit = (e) => {
    e.preventDefault();
    if (!form.weight) return;
    onSave({
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
  };

  const lengthUnit = unit === 'kg' ? 'cm' : 'in';
  const F = (fkey, suffix) => ({ value: form[fkey], onChange: set(fkey), suffix });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Weight *</label>
        <MeasurementField label="" value={form.weight} onChange={set('weight')} suffix={unit} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Girth Measurements</p>
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
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Skinfold Measurements</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MeasurementField label="Chest"       {...F('chestSkinfold',       'mm')} />
          <MeasurementField label="Abdominal"   {...F('abdominalSkinfold',   'mm')} />
          <MeasurementField label="Thigh"       {...F('thighSkinfold',       'mm')} />
          <MeasurementField label="Tricep"      {...F('tricepSkinfold',      'mm')} />
          <MeasurementField label="Subscapular" {...F('subscapularSkinfold', 'mm')} />
          <MeasurementField label="Suprailiac"  {...F('suprailiacSkinfold',  'mm')} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={form.notes} onChange={set('notes')} placeholder="Optional…" />
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Add Measurements" />
    </form>
  );
}

// ── Shared buttons ─────────────────────────────────────────────────────────────
function FormButtons({ onCancel, submitLabel = 'Save' }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        Cancel
      </button>
      <button type="submit"
        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all">
        {submitLabel}
      </button>
    </div>
  );
}

// ── Type button config ─────────────────────────────────────────────────────────
const TYPE_BTNS = [
  { id: 'meal',         emoji: '🍽️', label: 'Meal',    cls: 'border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500' },
  { id: 'exercise',     emoji: '🏃', label: 'Exercise', cls: 'border-orange-200 dark:border-orange-700/50 text-orange-700 dark:text-orange-300 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-orange-500/20' },
  { id: 'sleep',        emoji: '🛌', label: 'Sleep',    cls: 'border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-purple-500/20' },
  { id: 'measurements', emoji: '📏', label: 'Measure',  cls: 'border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300 hover:border-green-400 dark:hover:border-green-500 hover:shadow-green-500/20' },
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
  const [mode, setMode]           = useState('add');   // 'add' | 'view'
  const [activeType, setActiveType] = useState(null);
  const addEntry    = useMutation(api.entries.add);
  const deleteEntry = useMutation(api.entries.remove);
  const { settings } = useConvexSettings();

  const isFormActive = !!activeType;

  const handleSave = async (dataOrArray) => {
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    for (const item of items) {
      await addEntry(item);
    }
    setActiveType(null);
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

  // ── View Entries screen ────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div
        className="fixed inset-0 z-50 w-full h-full bg-white dark:bg-[var(--color-bg-base)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        style={{ paddingTop: '80px', paddingBottom: '80px' }}
      >
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setMode('add')}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
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
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-lg mx-auto px-4 py-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No entries yet</p>
                <button
                  onClick={() => setMode('add')}
                  className="mt-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
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

        {/* Footer — add entry button */}
        {entries.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setMode('add')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2"
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

  // ── Add Entry screen (default) ─────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-[var(--color-bg-base)] dark:via-[var(--color-bg-base)] dark:to-[var(--color-bg-base)] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div
        className={`flex-1 overflow-y-auto min-h-0 py-8 ${!isFormActive ? 'flex items-center justify-center' : ''}`}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center">

          {/* Date display */}
          {!isFormActive && (
            <div className="w-full max-w-[380px] md:max-w-4xl mx-auto mb-4 text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {formatDateLabel(date)}
              </div>
            </div>
          )}

          {/* Card */}
          <div className={`w-full ${
            isFormActive
              ? 'max-w-2xl mx-auto'
              : 'max-w-[380px] md:max-w-4xl mx-auto border border-gray-200/50 dark:border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl bg-white/95 dark:bg-[var(--color-bg-base)]/95 backdrop-blur-sm p-6 md:p-8 space-y-6 relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-50/50 before:via-transparent before:to-purple-50/50 dark:before:from-blue-900/10 dark:before:via-transparent dark:before:to-purple-900/10 before:pointer-events-none'
          }`}>

            {/* Card header */}
            {!isFormActive && (
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    Add a New Entry
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Close"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Entry type buttons */}
            {!isFormActive && (
              <div className="space-y-4 relative z-10">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Select Entry Type</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Choose what you'd like to track</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {TYPE_BTNS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveType(t.id)}
                      className={`group relative py-4 md:py-5 rounded-2xl font-semibold shadow-lg active:scale-[0.96] transition-all duration-300 text-sm md:text-base overflow-hidden bg-white dark:bg-gray-800/80 border-2 ${t.cls} hover:shadow-xl hover:-translate-y-0.5 flex flex-col items-center justify-center min-h-[4rem] w-full`}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span className="text-2xl md:text-3xl">{t.emoji}</span>
                        <span>{t.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active form */}
            {isFormActive && (
              <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeBtn?.emoji}</span>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {activeBtn?.label} Details
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveType(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {renderForm()}
              </div>
            )}

          </div>

          {/* View Entries button — shown below card when not in a form */}
          {!isFormActive && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setMode('view')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View All Entries ({entries.length})
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
