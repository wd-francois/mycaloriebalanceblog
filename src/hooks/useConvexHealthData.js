import { useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// ── Date helpers ──────────────────────────────────────────────────────────────

function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function strToDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Parse "8h 30m", "8h", "30m" → decimal hours
function parseDurationStr(str) {
  if (!str) return undefined;
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins  = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours + mins / 60;
}

// Format time parts { hour, minute, period } → "10:00 PM"
function formatTimeParts(t) {
  if (!t) return undefined;
  return `${t.hour}:${String(t.minute).padStart(2, '0')} ${t.period}`;
}

// ── The adapter hook ───────────────────────────────────────────────────────────

export function useConvexHealthData() {
  const allEntries  = useQuery(api.entries.listAll);
  const addMut      = useMutation(api.entries.add);
  const updateMut   = useMutation(api.entries.update);
  const removeMut   = useMutation(api.entries.remove);

  const loading         = allEntries === undefined;
  const isDBInitialized = allEntries !== undefined;

  // Convert flat Convex array → { [dateKey]: [entry] } matching useHealthData output
  const entries = useMemo(() => {
    if (!allEntries) return {};
    const map = {};
    for (const e of allEntries) {
      const date = strToDate(e.date);
      const key  = date.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push({
        ...e,
        id:   e._id,       // Convex _id becomes 'id' (the field useFormState reads)
        date,              // string → Date object
        fats: e.fat,       // fat → fats (Original field name)
      });
    }
    return map;
  }, [allEntries]);

  // ── addEntry ─────────────────────────────────────────────────────────────────
  // Receives entry built by useFormState.buildEntry — converts to Convex args
  async function addEntry(entry) {
    const dateStr = dateToStr(entry.date instanceof Date ? entry.date : new Date(entry.date));

    const base = {
      type: entry.type,
      date: dateStr,
      name: entry.name || undefined,
      notes: entry.notes || undefined,
      time: entry.time || undefined,
    };

    if (entry.type === 'meal') {
      await addMut({
        ...base,
        calories:    entry.calories    ? Number(entry.calories)    : undefined,
        protein:     entry.protein     ? Number(entry.protein)     : undefined,
        carbs:       entry.carbs       ? Number(entry.carbs)       : undefined,
        fat:         entry.fats        ? Number(entry.fats)        : undefined,  // fats→fat
        mealNumber:  entry.mealNumber  ? Number(entry.mealNumber)  : undefined,
      });
      return;
    }

    if (entry.type === 'exercise') {
      const setsData = Array.isArray(entry.sets) && entry.sets.length > 0
        ? entry.sets : null;
      await addMut({
        ...base,
        durationMinutes: entry.durationMinutes ? String(entry.durationMinutes) : undefined,
        exercisesData:   setsData ? JSON.stringify(setsData) : undefined,
      });
      return;
    }

    if (entry.type === 'activity') {
      await addMut({
        ...base,
        durationMinutes: entry.durationMinutes ? String(entry.durationMinutes) : undefined,
        distance:        entry.distance        ? String(entry.distance)        : undefined,
        steps:           entry.steps           ? String(entry.steps)           : undefined,
      });
      return;
    }

    if (entry.type === 'sleep') {
      const sleepDuration = typeof entry.duration === 'string'
        ? parseDurationStr(entry.duration)
        : (entry.sleepDuration ?? undefined);
      await addMut({
        ...base,
        bedtime:       entry.bedtime  || undefined,
        waketime:      entry.waketime || undefined,
        sleepStart:    entry.bedtime  ? formatTimeParts(entry.bedtime)  : undefined,
        sleepEnd:      entry.waketime ? formatTimeParts(entry.waketime) : undefined,
        sleepDuration: sleepDuration  || undefined,
        sleepQuality:  entry.sleepQuality || undefined,
      });
      return;
    }

    if (entry.type === 'measurements') {
      await addMut({
        ...base,
        weight:              entry.weight              ? Number(entry.weight)              : undefined,
        weightUnit:          entry.weightUnit          || undefined,
        neck:                entry.neck                ? Number(entry.neck)                : undefined,
        shoulders:           entry.shoulders           ? Number(entry.shoulders)           : undefined,
        chest:               entry.chest               ? Number(entry.chest)               : undefined,
        waist:               entry.waist               ? Number(entry.waist)               : undefined,
        hips:                entry.hips                ? Number(entry.hips)                : undefined,
        thigh:               entry.thigh               ? Number(entry.thigh)               : undefined,
        arm:                 entry.arm                 ? Number(entry.arm)                 : undefined,
        calf:                entry.calf                ? Number(entry.calf)                : undefined,
        chestSkinfold:       entry.chestSkinfold       ? Number(entry.chestSkinfold)       : undefined,
        abdominalSkinfold:   entry.abdominalSkinfold   ? Number(entry.abdominalSkinfold)   : undefined,
        thighSkinfold:       entry.thighSkinfold       ? Number(entry.thighSkinfold)       : undefined,
        tricepSkinfold:      entry.tricepSkinfold      ? Number(entry.tricepSkinfold)      : undefined,
        subscapularSkinfold: entry.subscapularSkinfold ? Number(entry.subscapularSkinfold) : undefined,
        suprailiacSkinfold:  entry.suprailiacSkinfold  ? Number(entry.suprailiacSkinfold)  : undefined,
      });
      return;
    }

    // Fallback — store whatever we have
    await addMut(base);
  }

  // ── updateEntry ───────────────────────────────────────────────────────────────
  // entry.id is the Convex document _id (stored as 'id' in adapted entries)
  async function updateEntry(entry) {
    if (!entry.id) return;

    const patch = {
      id: entry.id,
      name:  entry.name  || undefined,
      notes: entry.notes || undefined,
    };

    if (entry.type === 'meal') {
      Object.assign(patch, {
        calories: entry.calories ? Number(entry.calories) : undefined,
        protein:  entry.protein  ? Number(entry.protein)  : undefined,
        carbs:    entry.carbs    ? Number(entry.carbs)    : undefined,
        fat:      entry.fats     ? Number(entry.fats)     : undefined,
      });
    }
    if (entry.type === 'exercise' || entry.type === 'activity') {
      Object.assign(patch, {
        durationMinutes: entry.durationMinutes ? String(entry.durationMinutes) : undefined,
        distance:        entry.distance        ? String(entry.distance)        : undefined,
        steps:           entry.steps           ? String(entry.steps)           : undefined,
      });
    }
    if (entry.type === 'sleep') {
      Object.assign(patch, {
        bedtime:       entry.bedtime      || undefined,
        waketime:      entry.waketime     || undefined,
        sleepDuration: entry.sleepDuration ? Number(entry.sleepDuration) : undefined,
        sleepQuality:  entry.sleepQuality  || undefined,
      });
    }
    if (entry.type === 'measurements') {
      Object.assign(patch, {
        weight:              entry.weight              ? Number(entry.weight)              : undefined,
        neck:                entry.neck                ? Number(entry.neck)                : undefined,
        shoulders:           entry.shoulders           ? Number(entry.shoulders)           : undefined,
        chest:               entry.chest               ? Number(entry.chest)               : undefined,
        waist:               entry.waist               ? Number(entry.waist)               : undefined,
        hips:                entry.hips                ? Number(entry.hips)                : undefined,
        thigh:               entry.thigh               ? Number(entry.thigh)               : undefined,
        arm:                 entry.arm                 ? Number(entry.arm)                 : undefined,
        calf:                entry.calf                ? Number(entry.calf)                : undefined,
        chestSkinfold:       entry.chestSkinfold       ? Number(entry.chestSkinfold)       : undefined,
        abdominalSkinfold:   entry.abdominalSkinfold   ? Number(entry.abdominalSkinfold)   : undefined,
        thighSkinfold:       entry.thighSkinfold       ? Number(entry.thighSkinfold)       : undefined,
        tricepSkinfold:      entry.tricepSkinfold      ? Number(entry.tricepSkinfold)      : undefined,
        subscapularSkinfold: entry.subscapularSkinfold ? Number(entry.subscapularSkinfold) : undefined,
        suprailiacSkinfold:  entry.suprailiacSkinfold  ? Number(entry.suprailiacSkinfold)  : undefined,
      });
    }

    await updateMut(patch);
  }

  // ── deleteEntry ───────────────────────────────────────────────────────────────
  // entryId is the Convex _id (stored as 'id' in adapted entries)
  // date param kept for API compatibility with useHealthData but not needed
  async function deleteEntry(entryId) {
    await removeMut({ id: entryId });
  }

  function refresh() {
    // Convex is reactive — no manual refresh needed
  }

  return { entries, loading, isDBInitialized, addEntry, updateEntry, deleteEntry, refresh };
}
