import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// One-time rescue for entries logged in the free (Original) app on this
// device. The free app keeps entries only in the browser's IndexedDB
// (HealthTrackerDB → userEntries, see src/lib/database.js), so they never
// reach the user's Pro account or their coach. This reads them — read-only,
// the free app's data is left untouched — converts each one to Pro's entry
// shape, and adds it to the signed-in account.

const FREE_DB = 'HealthTrackerDB';
const FREE_STORE = 'userEntries';
// Per user, so a shared device doesn't skip entries for a second account.
const importedKey = (userId) => `mcb_pro_free_import_done_${userId}`;
const dismissedKey = (userId) => `mcb_pro_free_import_dismissed_${userId}`;

function readIds(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key)) ?? []); } catch { return new Set(); }
}

async function readFreeAppEntries() {
  if (typeof indexedDB === 'undefined') return [];
  // Opening a database that doesn't exist would create an empty one, so
  // check first where the browser lets us.
  if (indexedDB.databases) {
    try {
      const dbs = await indexedDB.databases();
      if (!dbs.some(d => d.name === FREE_DB)) return [];
    } catch {}
  }
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(FREE_DB);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    if (!db.objectStoreNames.contains(FREE_STORE)) return [];
    return await new Promise((resolve, reject) => {
      const req = db.transaction(FREE_STORE, 'readonly').objectStore(FREE_STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

// ── Free app entry → Pro entries.add args ────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

function toDateStr(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTime(t) {
  if (!t || typeof t !== 'object') return undefined;
  const hour = Number(t.hour), minute = Number(t.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  return { hour, minute, period: t.period === 'PM' ? 'PM' : 'AM' };
}

const fmtTime = (t) => `${t.hour}:${pad(t.minute)} ${t.period}`;

function num(v) {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v) {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

// "7h 30m" → 7.5 (the free app stores sleep duration as text)
function hours(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v !== 'string') return undefined;
  const h = v.match(/(\d+)\s*h/), m = v.match(/(\d+)\s*m/);
  if (!h && !m) return num(v);
  return (h ? parseInt(h[1], 10) : 0) + (m ? parseInt(m[1], 10) / 60 : 0);
}

const MEASUREMENT_FIELDS = [
  'weight', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'thigh', 'arm', 'calf',
  'chestSkinfold', 'abdominalSkinfold', 'thighSkinfold',
  'tricepSkinfold', 'subscapularSkinfold', 'suprailiacSkinfold',
];

function convert(e) {
  const date = toDateStr(e.date);
  if (!date) return null;
  const base = { date, time: toTime(e.time), notes: str(e.notes) };

  switch (e.type) {
    case 'meal':
      if (!str(e.name)) return null;
      return {
        ...base, type: 'meal', name: str(e.name), amount: str(e.amount),
        calories: num(e.calories), protein: num(e.protein), carbs: num(e.carbs),
        fat: num(e.fats ?? e.fat), fibre: num(e.fibre), other: str(e.other),
      };
    case 'exercise': {
      if (!str(e.name)) return null;
      const sets = Array.isArray(e.sets) ? e.sets.filter(Boolean) : [];
      const videoUrl = str(e.videoUrl);
      return {
        ...base, type: 'exercise', name: str(e.name),
        exercisesData: sets.length > 0
          ? JSON.stringify(sets.map(s => ({ reps: String(s.reps ?? ''), load: String(s.load ?? s.loadKg ?? '') })))
          : undefined,
        notes: [base.notes, videoUrl].filter(Boolean).join('\n') || undefined,
      };
    }
    case 'activity':
      if (!str(e.name)) return null;
      return {
        ...base, type: 'activity', name: str(e.name),
        durationMinutes: str(e.durationMinutes), distance: str(e.distance), steps: str(e.steps),
      };
    case 'sleep': {
      const bedtime = toTime(e.bedtime), waketime = toTime(e.waketime);
      return {
        date, type: 'sleep', notes: base.notes,
        bedtime, waketime,
        sleepStart: bedtime ? fmtTime(bedtime) : undefined,
        sleepEnd: waketime ? fmtTime(waketime) : undefined,
        sleepDuration: hours(e.duration ?? e.sleepDuration),
      };
    }
    case 'measurements': {
      const out = { ...base, type: 'measurements', name: str(e.name) };
      for (const f of MEASUREMENT_FIELDS) out[f] = num(e[f]);
      return out;
    }
    default:
      return null;
  }
}

// Convex rejects explicit nulls and is happiest without undefined keys.
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// ─────────────────────────────────────────────────────────────────────────────

export default function FreeAppImport() {
  const user = useQuery(api.users.viewer);
  const addEntry = useMutation(api.entries.add);
  const userId = user?._id;

  const [pending, setPending]   = useState(null);   // [{ id, args }] not yet imported
  const [progress, setProgress] = useState(null);   // { done, total } while importing
  const [result, setResult]     = useState(null);   // { imported, failed }
  const [hidden, setHidden]     = useState(false);

  useEffect(() => {
    if (!userId) return;
    try { if (localStorage.getItem(dismissedKey(userId))) { setHidden(true); return; } } catch {}
    let cancelled = false;
    readFreeAppEntries()
      .then(raw => {
        if (cancelled) return;
        const done = readIds(importedKey(userId));
        setPending(raw
          .filter(e => e && e.id != null && !done.has(String(e.id)))
          .map(e => ({ id: String(e.id), args: convert(e) }))
          .filter(e => e.args));
      })
      .catch(() => { if (!cancelled) setPending([]); });
    return () => { cancelled = true; };
  }, [userId]);

  if (hidden || !userId) return null;
  if (!result && (!pending || pending.length === 0)) return null;

  const dates = (pending ?? []).map(p => p.args.date).sort();
  const fmtDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const runImport = async () => {
    const done = readIds(importedKey(userId));
    let imported = 0, failed = 0;
    setProgress({ done: 0, total: pending.length });
    for (const [i, item] of pending.entries()) {
      try {
        await addEntry(clean(item.args));
        done.add(item.id);
        imported++;
        try { localStorage.setItem(importedKey(userId), JSON.stringify([...done])); } catch {}
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: pending.length });
    }
    setProgress(null);
    setPending(prev => prev.filter(p => !done.has(p.id)));
    setResult({ imported, failed });
  };

  const dismiss = () => {
    try { localStorage.setItem(dismissedKey(userId), '1'); } catch {}
    setHidden(true);
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 lg:p-5 flex items-start gap-3">
        <p className="flex-1 text-sm text-green-800 dark:text-green-300">
          {result.imported > 0 && <>Imported <strong>{result.imported}</strong> entr{result.imported === 1 ? 'y' : 'ies'} into your Pro account. </>}
          {result.failed > 0 && <>{result.failed} couldn&rsquo;t be imported — check your connection and try again. </>}
        </p>
        {result.failed > 0 ? (
          <button type="button" onClick={() => { setResult(null); }}
            className="text-sm font-semibold text-green-700 dark:text-green-300 shrink-0">Retry</button>
        ) : (
          <button type="button" onClick={() => setHidden(true)}
            className="text-sm font-semibold text-green-700 dark:text-green-300 shrink-0">Done</button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 lg:p-5 flex flex-col gap-3">
      <div>
        <p className="text-sm lg:text-base font-bold text-amber-900 dark:text-amber-200">
          {pending.length} entr{pending.length === 1 ? 'y' : 'ies'} found from the free app on this device
        </p>
        <p className="text-xs lg:text-sm text-amber-800 dark:text-amber-300 mt-1">
          {dates.length > 0 && <>Logged between {fmtDate(dates[0])} and {fmtDate(dates[dates.length - 1])}. </>}
          These are only saved on this device, so your coach can&rsquo;t see them. Import them into your Pro account?
        </p>
      </div>
      {progress ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 rounded-full bg-amber-200/60 dark:bg-amber-900/40 overflow-hidden">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">Importing {progress.done} of {progress.total}…</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={runImport}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
            Import {pending.length} entr{pending.length === 1 ? 'y' : 'ies'}
          </button>
          <button type="button" onClick={dismiss}
            className="px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            Don&rsquo;t import
          </button>
        </div>
      )}
    </div>
  );
}
