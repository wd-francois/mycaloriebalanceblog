import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const ENTRY_TYPES = [
  { id: 'meal', label: 'Meal', color: 'from-orange-500 to-amber-500', icon: '🍽️' },
  { id: 'exercise', label: 'Exercise', color: 'from-blue-500 to-cyan-500', icon: '🏋️' },
  { id: 'activity', label: 'Activity', color: 'from-green-500 to-emerald-500', icon: '🚶' },
  { id: 'sleep', label: 'Sleep', color: 'from-purple-500 to-indigo-500', icon: '😴' },
  { id: 'measurements', label: 'Weight', color: 'from-pink-500 to-rose-500', icon: '⚖️' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddEntryModal({ onClose, defaultDate }) {
  const [step, setStep] = useState('type'); // 'type' | 'form'
  const [entryType, setEntryType] = useState(null);
  const [saving, setSaving] = useState(false);
  const addEntry = useMutation(api.entries.add);

  const date = defaultDate || todayISO();

  const handleSelectType = (type) => {
    setEntryType(type);
    setStep('form');
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      await addEntry({ type: entryType, date, ...data });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 'form' && (
              <button onClick={() => setStep('type')} className="text-gray-400 hover:text-gray-600 mr-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="font-semibold text-gray-900">
              {step === 'type' ? 'What are you logging?' : `Add ${ENTRY_TYPES.find(t => t.id === entryType)?.label}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 'type' && (
            <div className="grid grid-cols-2 gap-3">
              {ENTRY_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type.id)}
                  className={`bg-gradient-to-br ${type.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-md`}
                >
                  <span className="text-3xl">{type.icon}</span>
                  <span className="font-semibold text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'form' && entryType === 'meal' && (
            <MealForm onSave={handleSave} saving={saving} />
          )}
          {step === 'form' && entryType === 'exercise' && (
            <ExerciseForm onSave={handleSave} saving={saving} />
          )}
          {step === 'form' && entryType === 'activity' && (
            <ActivityForm onSave={handleSave} saving={saving} />
          )}
          {step === 'form' && entryType === 'sleep' && (
            <SleepForm onSave={handleSave} saving={saving} />
          )}
          {step === 'form' && entryType === 'measurements' && (
            <MeasurementsForm onSave={handleSave} saving={saving} />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

function SaveButton({ saving, label = 'Save' }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all mt-2 flex items-center justify-center gap-2"
    >
      {saving ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving…
        </>
      ) : label}
    </button>
  );
}

function MealForm({ onSave, saving }) {
  const [f, setF] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return alert('Please enter a meal name.');
    if (!f.calories) return alert('Please enter calories.');
    onSave({
      name: f.name.trim(),
      calories: parseFloat(f.calories),
      protein: f.protein ? parseFloat(f.protein) : undefined,
      carbs: f.carbs ? parseFloat(f.carbs) : undefined,
      fat: f.fat ? parseFloat(f.fat) : undefined,
      notes: f.notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Meal name">
        <input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Grilled chicken salad" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories (kcal)">
          <input className={inputCls} type="number" min="0" value={f.calories} onChange={set('calories')} placeholder="400" required />
        </Field>
        <Field label="Protein (g)">
          <input className={inputCls} type="number" min="0" value={f.protein} onChange={set('protein')} placeholder="30" />
        </Field>
        <Field label="Carbs (g)">
          <input className={inputCls} type="number" min="0" value={f.carbs} onChange={set('carbs')} placeholder="45" />
        </Field>
        <Field label="Fat (g)">
          <input className={inputCls} type="number" min="0" value={f.fat} onChange={set('fat')} placeholder="12" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea className={inputCls} rows={2} value={f.notes} onChange={set('notes')} placeholder="Any notes…" />
      </Field>
      <SaveButton saving={saving} label="Save Meal" />
    </form>
  );
}

function ExerciseForm({ onSave, saving }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState([{ weight: '', reps: '' }]);

  const addSet = () => setSets((s) => [...s, { weight: '', reps: '' }]);
  const updateSet = (i, k, v) =>
    setSets((s) => s.map((set, idx) => (idx === i ? { ...set, [k]: v } : set)));
  const removeSet = (i) => setSets((s) => s.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter an exercise name.');
    const exercisesData = JSON.stringify([{
      name: name.trim(),
      sets: sets.map((s) => ({ weight: s.weight, reps: s.reps })),
    }]);
    onSave({ name: name.trim(), exercisesData, notes: notes.trim() || undefined });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Exercise name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bench Press" required />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Sets</label>
          <button type="button" onClick={addSet} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add set</button>
        </div>
        <div className="space-y-2">
          {sets.map((set, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
              <input
                className={`${inputCls} flex-1`}
                type="number" min="0"
                value={set.weight}
                onChange={(e) => updateSet(i, 'weight', e.target.value)}
                placeholder="kg"
              />
              <input
                className={`${inputCls} flex-1`}
                type="number" min="0"
                value={set.reps}
                onChange={(e) => updateSet(i, 'reps', e.target.value)}
                placeholder="reps"
              />
              {sets.length > 1 && (
                <button type="button" onClick={() => removeSet(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <Field label="Notes (optional)">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" />
      </Field>
      <SaveButton saving={saving} label="Save Exercise" />
    </form>
  );
}

function ActivityForm({ onSave, saving }) {
  const [f, setF] = useState({ name: '', duration: '', distance: '', steps: '', notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return alert('Please enter an activity name.');
    onSave({
      name: f.name.trim(),
      durationMinutes: f.duration || undefined,
      distance: f.distance || undefined,
      steps: f.steps || undefined,
      notes: f.notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Activity">
        <input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Walking, Cycling…" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (min)">
          <input className={inputCls} type="number" min="0" value={f.duration} onChange={set('duration')} placeholder="30" />
        </Field>
        <Field label="Distance (km)">
          <input className={inputCls} type="number" min="0" step="0.01" value={f.distance} onChange={set('distance')} placeholder="5.0" />
        </Field>
      </div>
      <Field label="Steps">
        <input className={inputCls} type="number" min="0" value={f.steps} onChange={set('steps')} placeholder="8000" />
      </Field>
      <SaveButton saving={saving} label="Save Activity" />
    </form>
  );
}

function SleepForm({ onSave, saving }) {
  const [f, setF] = useState({ duration: '', quality: '', notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.duration) return alert('Please enter sleep duration.');
    onSave({
      sleepDuration: parseFloat(f.duration),
      sleepQuality: f.quality || undefined,
      notes: f.notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Duration (hours)">
        <input className={inputCls} type="number" min="0" max="24" step="0.5" value={f.duration} onChange={set('duration')} placeholder="7.5" required />
      </Field>
      <Field label="Quality">
        <select className={inputCls} value={f.quality} onChange={set('quality')}>
          <option value="">Select quality</option>
          <option value="poor">Poor</option>
          <option value="fair">Fair</option>
          <option value="good">Good</option>
          <option value="excellent">Excellent</option>
        </select>
      </Field>
      <Field label="Notes (optional)">
        <textarea className={inputCls} rows={2} value={f.notes} onChange={set('notes')} placeholder="Any notes…" />
      </Field>
      <SaveButton saving={saving} label="Save Sleep" />
    </form>
  );
}

function MeasurementsForm({ onSave, saving }) {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('kg');
  const [notes, setNotes] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!weight) return alert('Please enter your weight.');
    onSave({
      weight: parseFloat(weight),
      weightUnit: unit,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Weight">
            <input className={inputCls} type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70.0" required />
          </Field>
        </div>
        <div className="w-24">
          <Field label="Unit">
            <select className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </Field>
        </div>
      </div>
      <Field label="Notes (optional)">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" />
      </Field>
      <SaveButton saving={saving} label="Save Weight" />
    </form>
  );
}
