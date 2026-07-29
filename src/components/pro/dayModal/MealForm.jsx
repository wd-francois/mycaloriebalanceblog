import { useState } from 'react';
import AutocompleteInput from '../../AutocompleteInput';
import TimePicker from '../../TimePicker';
import { getCurrentTimeParts } from '../../../lib/dateUtils';
import { LABEL, INPUT } from './styles';
import FormButtons from './FormButtons';

// ── Meal Form ──────────────────────────────────────────────────────────────────
export default function MealForm({ dateStr, onSave, onCancel }) {
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
