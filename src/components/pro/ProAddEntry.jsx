import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nowTime() {
  const d = new Date();
  const h = d.getHours();
  return { hour: h % 12 || 12, minute: d.getMinutes(), period: h >= 12 ? 'PM' : 'AM' };
}

// ── Shared input styles ────────────────────────────────────────────────────────
const INPUT = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';
const LABEL = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';
const ROW2 = 'grid grid-cols-2 gap-3';
const ROW3 = 'grid grid-cols-3 gap-2';

// ── Meal Form ─────────────────────────────────────────────────────────────────
function MealForm({ onSave, onCancel }) {
  const [date, setDate]       = useState(todayStr());
  const [time, setTime]       = useState(nowTime());
  const [name, setName]       = useState('');
  const [meal, setMeal]       = useState(1);
  const [cal, setCal]         = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs]     = useState('');
  const [fat, setFat]         = useState('');
  const [notes, setNotes]     = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      type: 'meal',
      date,
      time,
      name: name.trim() || undefined,
      mealNumber: meal,
      calories: cal ? Number(cal) : undefined,
      protein:  protein ? Number(protein) : undefined,
      carbs:    carbs   ? Number(carbs)   : undefined,
      fat:      fat     ? Number(fat)     : undefined,
      notes:    notes.trim() || undefined,
    });
  };

  const mealLabels = ['Breakfast', 'Snack', 'Lunch', 'Snack', 'Dinner', 'Snack'];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Meal name</label>
        <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oatmeal, Chicken salad…" />
      </div>

      <div>
        <label className={LABEL}>Meal</label>
        <div className="flex gap-1.5 flex-wrap">
          {mealLabels.map((lbl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMeal(i + 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                meal === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {i + 1}. {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className={ROW3}>
        <div>
          <label className={LABEL}>Calories</label>
          <input type="number" min="0" className={INPUT} value={cal} onChange={e => setCal(e.target.value)} placeholder="kcal" />
        </div>
        <div>
          <label className={LABEL}>Protein</label>
          <input type="number" min="0" className={INPUT} value={protein} onChange={e => setProtein(e.target.value)} placeholder="g" />
        </div>
        <div>
          <label className={LABEL}>Carbs</label>
          <input type="number" min="0" className={INPUT} value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="g" />
        </div>
      </div>

      <div className={ROW2}>
        <div>
          <label className={LABEL}>Fat</label>
          <input type="number" min="0" className={INPUT} value={fat} onChange={e => setFat(e.target.value)} placeholder="g" />
        </div>
        <div>
          <label className={LABEL}>Date</label>
          <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
}

// ── Coach Program Picker modal ─────────────────────────────────────────────────
function ProgramPicker({ onSelect, onClose }) {
  const programs = useQuery(api.programs.getMyPrograms) ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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

// ── Exercise Form ─────────────────────────────────────────────────────────────
function ExerciseForm({ onSave, onCancel }) {
  const [date, setDate]           = useState(todayStr());
  const [name, setName]           = useState('');
  const [duration, setDuration]   = useState('');
  const [notes, setNotes]         = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '' }]);
  const [showPicker, setShowPicker] = useState(false);

  const addRow = () => setExercises(prev => [...prev, { name: '', sets: '', reps: '', weight: '' }]);
  const updateRow = (i, field, val) =>
    setExercises(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeRow = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i));

  const loadProgram = (program) => {
    let loaded = [];
    try { loaded = JSON.parse(program.exercises); } catch {}
    if (loaded.length > 0) setExercises(loaded.map(e => ({ name: e.name || '', sets: e.sets || '', reps: e.reps || '', weight: e.weight || '' })));
    if (!name.trim()) setName(program.name);
    setShowPicker(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validExercises = exercises.filter(r => r.name.trim());
    onSave({
      type: 'exercise',
      date,
      name: name.trim() || 'Workout',
      durationMinutes: duration || undefined,
      exercisesData: validExercises.length ? JSON.stringify(validExercises) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <>
      {showPicker && <ProgramPicker onSelect={loadProgram} onClose={() => setShowPicker(false)} />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className={ROW2}>
          <div>
            <label className={LABEL}>Workout name</label>
            <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Upper body" />
          </div>
          <div>
            <label className={LABEL}>Duration (min)</label>
            <input type="number" min="0" className={INPUT} value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" />
          </div>
        </div>

        {/* Exercise rows */}
        <div>
          <label className={LABEL}>Exercises</label>
          <div className="flex flex-col gap-2">
            {exercises.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className={INPUT + ' flex-1'}
                  value={row.name}
                  onChange={e => updateRow(i, 'name', e.target.value)}
                  placeholder="Exercise"
                />
                <input
                  type="number" min="0"
                  className="w-16 px-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={row.sets}
                  onChange={e => updateRow(i, 'sets', e.target.value)}
                  placeholder="Sets"
                />
                <input
                  type="number" min="0"
                  className="w-16 px-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={row.reps}
                  onChange={e => updateRow(i, 'reps', e.target.value)}
                  placeholder="Reps"
                />
                {exercises.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={addRow}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              + Add exercise
            </button>
            <button type="button" onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Load coach program
            </button>
          </div>
        </div>

        <div className={ROW2}>
          <div>
            <label className={LABEL}>Date</label>
            <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Notes</label>
          <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
        </div>

        <FormActions onCancel={onCancel} />
      </form>
    </>
  );
}

// ── Activity Form ─────────────────────────────────────────────────────────────
function ActivityForm({ onSave, onCancel }) {
  const [date, setDate]         = useState(todayStr());
  const [name, setName]         = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [steps, setSteps]       = useState('');
  const [notes, setNotes]       = useState('');

  const PRESETS = ['Walk', 'Run', 'Cycle', 'Swim', 'Hike', 'Dance'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      type: 'activity',
      date,
      name: name.trim() || 'Activity',
      durationMinutes: duration || undefined,
      distance:        distance || undefined,
      steps:           steps    || undefined,
      notes:           notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Activity type</label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setName(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                name === p
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Or type a custom activity…" />
      </div>

      <div className={ROW3}>
        <div>
          <label className={LABEL}>Duration</label>
          <input type="number" min="0" className={INPUT} value={duration} onChange={e => setDuration(e.target.value)} placeholder="min" />
        </div>
        <div>
          <label className={LABEL}>Distance</label>
          <input className={INPUT} value={distance} onChange={e => setDistance(e.target.value)} placeholder="km/mi" />
        </div>
        <div>
          <label className={LABEL}>Steps</label>
          <input type="number" min="0" className={INPUT} value={steps} onChange={e => setSteps(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div>
        <label className={LABEL}>Date</label>
        <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
}

// ── Sleep Form ────────────────────────────────────────────────────────────────
function SleepForm({ onSave, onCancel }) {
  const [date, setDate]     = useState(todayStr());
  const [bedtime, setBedtime] = useState('22:00');
  const [waketime, setWaketime] = useState('06:00');
  const [quality, setQuality] = useState('Good');
  const [notes, setNotes]   = useState('');

  const duration = (() => {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = waketime.split(':').map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins < 0) mins += 1440;
    return +(mins / 60).toFixed(2);
  })();

  const QUALITIES = ['Poor', 'Fair', 'Good', 'Excellent'];
  const QUALITY_COLOR = { Poor: 'bg-red-500', Fair: 'bg-yellow-500', Good: 'bg-green-500', Excellent: 'bg-blue-500' };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      type: 'sleep',
      date,
      sleepStart:    bedtime,
      sleepEnd:      waketime,
      sleepDuration: duration,
      sleepQuality:  quality,
      notes:         notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className={ROW2}>
        <div>
          <label className={LABEL}>Bedtime</label>
          <input type="time" className={INPUT} value={bedtime} onChange={e => setBedtime(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Wake time</label>
          <input type="time" className={INPUT} value={waketime} onChange={e => setWaketime(e.target.value)} />
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-purple-500 dark:text-purple-400 font-medium uppercase tracking-wide">Duration</p>
        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">{duration.toFixed(1)}h</p>
      </div>

      <div>
        <label className={LABEL}>Sleep quality</label>
        <div className="flex gap-2">
          {QUALITIES.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all text-white ${
                quality === q ? QUALITY_COLOR[q] + ' ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-current' : 'bg-gray-200 dark:bg-gray-700 !text-gray-600 dark:!text-gray-300'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL}>Date (morning)</label>
        <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
}

// ── Measurements Form ─────────────────────────────────────────────────────────
function MeasurementsForm({ onSave, onCancel }) {
  const [date, setDate]     = useState(todayStr());
  const [weight, setWeight] = useState('');
  const [unit, setUnit]     = useState('kg');
  const [notes, setNotes]   = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      type: 'measurements',
      date,
      weight:     weight ? Number(weight) : undefined,
      weightUnit: unit,
      notes:      notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Weight</label>
        <div className="flex gap-2">
          <input
            type="number" step="0.1" min="0"
            className={INPUT + ' flex-1'}
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="0.0"
          />
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {['kg', 'lbs'].map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-4 text-sm font-semibold transition-colors ${
                  unit === u
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-[var(--color-bg-subtle)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL}>Date</label>
        <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
}

// ── Shared Save / Cancel buttons ──────────────────────────────────────────────
function FormActions({ onCancel }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
      >
        Save
      </button>
    </div>
  );
}

// ── Type Selector ─────────────────────────────────────────────────────────────
const TYPES = [
  { id: 'meal',         emoji: '🍽',  label: 'Meal',        color: 'border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20',  activeColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-500' },
  { id: 'exercise',     emoji: '💪',  label: 'Exercise',    color: 'border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20',          activeColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500' },
  { id: 'activity',     emoji: '🏃',  label: 'Activity',    color: 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20',      activeColor: 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-500' },
  { id: 'sleep',        emoji: '😴',  label: 'Sleep',       color: 'border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20',  activeColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-500' },
  { id: 'measurements', emoji: '⚖️', label: 'Weight',      color: 'border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20',          activeColor: 'bg-teal-50 dark:bg-teal-900/30 border-teal-400 dark:border-teal-500' },
];

export default function ProAddEntry({ onNavigate }) {
  const [selected, setSelected] = useState(null);
  const [saved, setSaved]       = useState(false);
  const addEntry = useMutation(api.entries.add);

  const handleSave = async (data) => {
    await addEntry(data);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelected(null);
      onNavigate('home');
    }, 900);
  };

  const FORMS = {
    meal:         MealForm,
    exercise:     ExerciseForm,
    activity:     ActivityForm,
    sleep:        SleepForm,
    measurements: MeasurementsForm,
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-800 dark:text-gray-200">Entry saved!</p>
      </div>
    );
  }

  const ActiveForm = selected ? FORMS[selected] : null;

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="pt-4 px-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add Entry</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">What would you like to track?</p>
      </div>

      {/* Type grid */}
      <div className="grid grid-cols-3 gap-3">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setSelected(selected === t.id ? null : t.id)}
            className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
              selected === t.id ? t.activeColor : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 ' + t.color
            }`}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      {ActiveForm && (
        <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">
            {TYPES.find(t => t.id === selected)?.emoji}{' '}
            {TYPES.find(t => t.id === selected)?.label} Details
          </h2>
          <ActiveForm onSave={handleSave} onCancel={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
