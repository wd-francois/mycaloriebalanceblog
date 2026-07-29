import { useState } from 'react';
import { calculateSleepDuration } from '../../../lib/dateUtils';
import { formatTime } from '../../../lib/utils';
import { LABEL, INPUT } from './styles';
import FormButtons from './FormButtons';

// ── Sleep Form ─────────────────────────────────────────────────────────────────
const defaultBedtime  = { hour: 10, minute: 0, period: 'PM' };
const defaultWaketime = { hour: 6,  minute: 0, period: 'AM' };

export function TimeSelect({ value, onChange }) {
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

export default function SleepForm({ dateStr, onSave, onCancel }) {
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
