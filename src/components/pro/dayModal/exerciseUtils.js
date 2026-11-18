// Helpers shared by the exercise card (EntryCard) and the exercise log form.

// "push up", "Push Up" and "PUSH UP " all become "Push Up", so the same
// exercise is stored under one display name. Only the first letter of each
// word is changed; the rest is kept so names like "RDL" survive.
export function normaliseExerciseName(name) {
  return (name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Case-insensitive identity for matching exercises across entries.
export const exerciseKey = (name) => normaliseExerciseName(name).toLowerCase();

// Reps outside this range are almost always typos ("88" for "8").
export const REPS_MIN = 1;
export const REPS_MAX = 100;

const BODYWEIGHT_RE = /^(b\/?w|bodyweight|body ?weight|body)$/i;

// Reads a free-text load like "50", "50kg", "50 kg", "110 lb" or "B/W".
// Returns one of:
//   { kind: 'weight', value, unit }   numeric load, unit from the text or the default
//   { kind: 'bodyweight' }            empty or a bodyweight marker
//   { kind: 'text', text }            anything else, shown as typed (e.g. "band")
export function parseLoad(load, defaultUnit = 'kg') {
  const raw = (load ?? '').toString().trim();
  if (!raw || BODYWEIGHT_RE.test(raw)) return { kind: 'bodyweight' };
  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilos?|lb|lbs|pounds?)?$/i);
  if (!m) return { kind: 'text', text: raw };
  const value = parseFloat(m[1].replace(',', '.'));
  const unit = m[2] ? (/^(lb|lbs|pounds?)$/i.test(m[2]) ? 'lb' : 'kg') : defaultUnit;
  return { kind: 'weight', value, unit };
}

export function formatWeight(value, unit) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

export function parseReps(reps) {
  const n = parseInt(reps, 10);
  return Number.isFinite(n) ? n : null;
}

// Totals for a list of sets ({ load, reps }): volume for weighted sets, total
// reps for a bodyweight exercise (no set has a numeric load).
export function summariseSets(sets, defaultUnit = 'kg') {
  let volume = 0, totalReps = 0, weighted = 0, unit = defaultUnit;
  for (const s of sets) {
    const reps = parseReps(s.reps) ?? 0;
    totalReps += reps;
    const load = parseLoad(s.load, defaultUnit);
    if (load.kind === 'weight') {
      weighted++;
      volume += load.value * reps;
      unit = load.unit;
    }
  }
  return { sets: sets.length, totalReps, volume, unit, isBodyweight: weighted === 0 };
}
