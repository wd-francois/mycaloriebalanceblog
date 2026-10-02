import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { INPUT, LABEL, CARD } from './styles';

// Pro's own copy of the Original app's /calorie-calculator/ page. Picking a
// goal saves it straight to the user's Pro settings — no localStorage hand-off
// to Pro like the Original page needs.

const STORAGE_KEY = 'mcb_pro_calorie_calculator';

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Sedentary (little or no exercise)' },
  { value: 1.375, label: 'Lightly Active (1-3 days/week)' },
  { value: 1.55,  label: 'Moderately Active (3-5 days/week)' },
  { value: 1.725, label: 'Very Active (6-7 days/week)' },
  { value: 1.9,   label: 'Extremely Active (athlete/physical job)' },
];

const GOALS = [
  { key: 'weightLoss',  label: 'Weight Loss', sub: '-500 cal deficit', ring: 'ring-red-400',   text: 'text-red-600 dark:text-red-400' },
  { key: 'maintenance', label: 'Maintenance', sub: 'maintain weight',  ring: 'ring-green-400', text: 'text-green-600 dark:text-green-400' },
  { key: 'weightGain',  label: 'Weight Gain', sub: '+500 cal surplus', ring: 'ring-blue-400',  text: 'text-blue-600 dark:text-blue-400' },
];

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null; } catch { return null; }
}

function calculate({ gender, age, weight, height, activity }) {
  const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
  const tdee = Math.round(bmr * activity);
  return {
    bmr: Math.round(bmr),
    tdee,
    weightLoss: tdee - 500,
    maintenance: tdee,
    weightGain: tdee + 500,
  };
}

export default function CalorieCalculatorTool() {
  const [saved] = useState(loadSaved);
  const [gender, setGender]     = useState(saved?.gender ?? '');
  const [age, setAge]           = useState(saved?.age ?? '');
  const [weight, setWeight]     = useState(saved?.weight ?? '');
  const [height, setHeight]     = useState(saved?.height ?? '');
  const [activity, setActivity] = useState(saved?.activity ?? '');
  const [result, setResult]     = useState(saved?.result ?? null);
  const [savingGoal, setSavingGoal] = useState(null);
  const [goalError, setGoalError]   = useState('');

  const settings  = useQuery(api.userSettings.get);
  const saveGoals = useMutation(api.userSettings.set);
  const currentGoal = settings?.calorieGoal;

  const submit = (e) => {
    e.preventDefault();
    const values = {
      gender,
      age: parseInt(age, 10),
      weight: parseFloat(weight),
      height: parseFloat(height),
      activity: parseFloat(activity),
    };
    const next = calculate(values);
    setResult(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ gender, age, weight, height, activity, result: next }));
    } catch {}
  };

  const pickGoal = async (goal) => {
    setGoalError('');
    setSavingGoal(goal.key);
    try {
      await saveGoals({ calorieGoal: result[goal.key] });
    } catch (err) {
      setGoalError(err.message || "Couldn't save your calorie goal.");
    } finally {
      setSavingGoal(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <form onSubmit={submit} className={`${CARD} flex flex-col gap-4`}>
        <div>
          <span className={LABEL}>Gender</span>
          <div className="grid grid-cols-2 gap-3">
            {['male', 'female'].map(g => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-colors ${
                  gender === g
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LABEL} htmlFor="cc-age">Age</label>
            <input id="cc-age" type="number" min="10" max="120" required className={INPUT}
              value={age} onChange={e => setAge(e.target.value)} placeholder="25" />
          </div>
          <div>
            <label className={LABEL} htmlFor="cc-weight">Weight (kg)</label>
            <input id="cc-weight" type="number" step="0.1" min="20" max="300" required className={INPUT}
              value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" />
          </div>
          <div>
            <label className={LABEL} htmlFor="cc-height">Height (cm)</label>
            <input id="cc-height" type="number" step="0.1" min="100" max="250" required className={INPUT}
              value={height} onChange={e => setHeight(e.target.value)} placeholder="175" />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="cc-activity">Activity level</label>
          <select id="cc-activity" required className={INPUT}
            value={activity} onChange={e => setActivity(e.target.value)}>
            <option value="">Select your activity level</option>
            {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        <button type="submit" disabled={!gender}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm lg:text-base font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 shadow-sm transition-all">
          Calculate my calories
        </button>
      </form>

      {result && (
        <div className={`${CARD} flex flex-col gap-4`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-[var(--color-bg-subtle)] p-4 text-center">
              <p className={LABEL}>BMR</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{result.bmr.toLocaleString()}</p>
              <p className="text-xs text-gray-400">calories/day at rest</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-[var(--color-bg-subtle)] p-4 text-center">
              <p className={LABEL}>TDEE</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{result.tdee.toLocaleString()}</p>
              <p className="text-xs text-gray-400">total calories/day</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Goal recommendations</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
              Tap one to set it as your daily calorie goal.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {GOALS.map(goal => {
                const value = result[goal.key];
                const selected = currentGoal === value;
                return (
                  <button key={goal.key} type="button" onClick={() => pickGoal(goal)} disabled={savingGoal !== null}
                    className={`rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center transition-all hover:shadow-md disabled:opacity-60 ${selected ? `ring-4 ${goal.ring}` : ''}`}>
                    <p className={`text-xs font-semibold ${goal.text}`}>{goal.label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                      {savingGoal === goal.key ? '…' : value.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">{goal.sub}</p>
                  </button>
                );
              })}
            </div>
            {currentGoal != null && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Your current goal: <strong className="text-gray-700 dark:text-gray-200">{currentGoal.toLocaleString()} cal/day</strong>
              </p>
            )}
            {goalError && (
              <p className="mt-3 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-xs font-medium text-red-600 dark:text-red-400">
                {goalError}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Uses the <strong>Mifflin-St Jeor equation</strong> to estimate your Basal Metabolic Rate (calories burned at rest).
        TDEE (Total Daily Energy Expenditure) is BMR multiplied by your activity level.
      </p>
    </div>
  );
}
