import { useState, useEffect, useMemo } from 'react';
import healthDB from '../lib/database.js';

const DEFAULTS = {
  mealName: 'e.g., Breakfast, lunch, or pick from your library',
  mealAmount: 'e.g., 1 cup, 500 g, 2 slices',
  mealCalories: 'e.g., 250',
  mealProtein: 'e.g., 20',
  mealCarbs: 'e.g., 30',
  mealFats: 'e.g., 10',
  mealFibre: 'e.g., 5',
  mealOther: 'e.g., sodium, vitamins',
  exerciseName: 'e.g., Bench press — or choose from your library',
  exerciseReps: '8',
  exerciseLoad: '80',
};

function uniqueStrings(items, getter, max) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const s = getter(it);
    if (!s || typeof s !== 'string') continue;
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function joinExamples(parts, prefix = 'e.g. ') {
  if (!parts.length) return null;
  if (parts.length === 1) return `${prefix}${parts[0]}`;
  if (parts.length === 2) return `${prefix}${parts[0]} · ${parts[1]}`;
  return `${prefix}${parts.slice(0, 3).join(', ')}`;
}

/**
 * Loads recent food / exercise library rows to build helpful placeholders and datalist values.
 * @param {{ enabled?: boolean }} opts — set enabled false during SSR or before DB is ready
 */
export function useLibraryPlaceholders(opts = {}) {
  const { enabled = true } = opts;
  const [foods, setFoods] = useState([]);
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        if (!healthDB.db) await healthDB.init();
        const [f, e] = await Promise.all([
          healthDB.getFoodItems('', 24),
          healthDB.getExerciseItems('', 24),
        ]);
        if (!cancelled) {
          setFoods(f || []);
          setExercises(e || []);
        }
      } catch {
        if (!cancelled) {
          setFoods([]);
          setExercises([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return useMemo(() => {
    const mealNames = uniqueStrings(foods, (f) => f.name, 4);
    const mealNamePlaceholder = joinExamples(mealNames, 'e.g. ') ?? DEFAULTS.mealName;

    const amounts = uniqueStrings(
      foods.filter((f) => f.amount && String(f.amount).trim()),
      (f) => String(f.amount).trim(),
      12
    );
    const mealAmountPlaceholder = joinExamples(amounts.slice(0, 3), 'e.g. ') ?? DEFAULTS.mealAmount;

    const firstNum = (items, key, fallback) => {
      for (const f of items) {
        const v = f[key];
        if (v != null && v !== '' && !Number.isNaN(Number(v))) return String(v);
      }
      return fallback;
    };

    const exNames = uniqueStrings(exercises, (x) => x.name, 4);
    const exerciseNamePlaceholder = joinExamples(exNames, 'e.g. ') ?? DEFAULTS.exerciseName;

    let exerciseRepsPlaceholder = DEFAULTS.exerciseReps;
    let exerciseLoadPlaceholder = DEFAULTS.exerciseLoad;
    for (const x of exercises) {
      if (x.defaultReps != null && String(x.defaultReps).trim()) {
        exerciseRepsPlaceholder = String(x.defaultReps);
        break;
      }
    }
    for (const x of exercises) {
      if (x.defaultLoad != null && String(x.defaultLoad).trim()) {
        exerciseLoadPlaceholder = String(x.defaultLoad);
        break;
      }
    }

    return {
      ready: foods.length > 0 || exercises.length > 0,
      foods,
      exercises,
      mealNamePlaceholder,
      mealAmountPlaceholder,
      mealAmountOptions: amounts,
      mealCaloriesPlaceholder: `e.g. ${firstNum(foods, 'calories', '250')}`,
      mealProteinPlaceholder: `e.g. ${firstNum(foods, 'protein', '20')}`,
      mealCarbsPlaceholder: `e.g. ${firstNum(foods, 'carbs', '30')}`,
      mealFatsPlaceholder: `e.g. ${firstNum(foods, 'fats', '10')}`,
      mealFibrePlaceholder: `e.g. ${firstNum(foods, 'fibre', '5')}`,
      mealOtherPlaceholder:
        joinExamples(uniqueStrings(foods, (f) => f.other, 2), 'e.g. ') ?? DEFAULTS.mealOther,
      exerciseNamePlaceholder,
      exerciseRepsPlaceholder,
      exerciseLoadPlaceholder,
    };
  }, [foods, exercises]);
}
