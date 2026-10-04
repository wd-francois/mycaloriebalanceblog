import { useState } from 'react';
import AutocompleteInput from '../../AutocompleteInput';
import TimePicker from '../../TimePicker';
import { getCurrentTimeParts } from '../../../lib/dateUtils';
import { useConvexSettings } from '../../../contexts/ConvexSettingsContext';
import { LABEL, INPUT } from './styles';
import FormButtons from './FormButtons';
import { openAINutritionLookup, AIIcon } from './aiLookup';

const str = (v) => (v == null ? '' : String(v));

// ── Meal Form ──────────────────────────────────────────────────────────────────
// `initial` is an existing meal entry when editing; omitted when adding.
export default function MealForm({ dateStr, onSave, onCancel, initial, submitLabel = 'Add Meal Entry' }) {
  const [name, setName]       = useState(str(initial?.name));
  const [amount, setAmount]   = useState(str(initial?.amount));
  const [meal, setMeal]       = useState(initial?.mealNumber ?? 1);
  const [cal, setCal]         = useState(str(initial?.calories));
  const [protein, setProtein] = useState(str(initial?.protein));
  const [carbs, setCarbs]     = useState(str(initial?.carbs));
  const [fat, setFat]         = useState(str(initial?.fat));
  const [fibre, setFibre]     = useState(str(initial?.fibre));
  const [sodium, setSodium]   = useState(str(initial?.sodium));
  const [other, setOther]     = useState(str(initial?.other));
  const [notes, setNotes]     = useState(str(initial?.notes));
  const [time, setTime]       = useState(() => initial?.time ?? getCurrentTimeParts());
  const [nameError, setNameError] = useState(false);
  const aiSettings = useConvexSettings();

  const handleAIClick = () => {
    if (!name.trim()) { setNameError(true); return; }
    openAINutritionLookup(aiSettings, {
      name: name.trim(), amount, calories: cal, protein, carbs, fat, fibre, sodium, other,
    });
  };

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
    if (!name.trim()) { setNameError(true); return; }
    // TimePicker adds a display-only `formatted` field the Convex validator rejects.
    const { hour, minute, period } = time;
    onSave({
      type: 'meal', date: dateStr, time: { hour, minute, period },
      name:      name.trim(),
      amount:    amount    || undefined,
      mealNumber: meal,
      calories:  cal     ? Number(cal)     : undefined,
      protein:   protein ? Number(protein) : undefined,
      carbs:     carbs   ? Number(carbs)   : undefined,
      fat:       fat     ? Number(fat)     : undefined,
      fibre:     fibre   ? Number(fibre)   : undefined,
      sodium:    sodium  ? Number(sodium)  : undefined,
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
        <div className="flex items-center justify-between">
          <label className={LABEL}>Meal Name</label>
          <button
            type="button"
            onClick={handleAIClick}
            title="Get nutrition info from your AI assistant"
            className="mb-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <AIIcon className="w-3.5 h-3.5" />
            Ask AI
          </button>
        </div>
        <AutocompleteInput
          type="food"
          value={name}
          onChange={(v) => { setName(v); if (nameError) setNameError(false); }}
          onSelect={handleAutocompleteSelect}
          placeholder="e.g. Oatmeal, Chicken salad…"
          autoFocus
        />
        {nameError && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            Please enter a meal name.
          </p>
        )}
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
          ['Sodium (mg)', sodium,  setSodium,  'number'],
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
          placeholder="e.g. Sugar 5g, Cholesterol 30mg…"
        />
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
      </div>

      <FormButtons onCancel={onCancel} submitLabel={submitLabel} />
    </form>
  );
}
