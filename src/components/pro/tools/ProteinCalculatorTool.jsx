import { useState } from 'react';
import { INPUT, LABEL, CARD } from './styles';

// Pro's own copy of the Original app's /protein-calculator/ page.

const fmt = (n, dec = 2) => (isFinite(n) ? Number(n).toFixed(dec).replace(/\.0+$/, '') : '—');

function interpret(ratio) {
  if (ratio >= 0.2) return { text: 'Very high protein', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
  if (ratio >= 0.1) return { text: 'Moderate protein',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  return { text: 'Low protein', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' };
}

export default function ProteinCalculatorTool() {
  const [protein, setProtein]   = useState('');
  const [calories, setCalories] = useState('');
  const [name, setName]         = useState('');
  const [copied, setCopied]     = useState(false);

  const p = parseFloat(protein);
  const c = parseFloat(calories);
  const result = !isNaN(p) && !isNaN(c) && c > 0 && p >= 0
    ? { ratio: p / c, per100: (p / c) * 100, kcalPerGram: p > 0 ? c / p : NaN }
    : null;
  const label = result && interpret(result.ratio);
  const summary = `${name.trim() ? `${name.trim()} — ` : ''}${p} g protein · ${c} kcal`;

  const copy = async () => {
    if (!result) return;
    const text = `${summary}\nProtein per kcal: ${fmt(result.ratio, 3)}\nProtein per 100 kcal: ${fmt(result.per100)} g\nCalories per g protein: ${fmt(result.kcalPerGram, 1)} kcal/g\n(${label.text})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const clear = () => { setProtein(''); setCalories(''); setName(''); };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className={`${CARD} flex flex-col gap-4`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="pc-protein">Protein (g)</label>
            <input id="pc-protein" type="number" min="0" step="0.1" className={INPUT}
              value={protein} onChange={e => setProtein(e.target.value)} placeholder="e.g. 25" />
          </div>
          <div>
            <label className={LABEL} htmlFor="pc-calories">Calories (kcal)</label>
            <input id="pc-calories" type="number" min="0" step="1" className={INPUT}
              value={calories} onChange={e => setCalories(e.target.value)} placeholder="e.g. 250" />
          </div>
        </div>
        <div>
          <label className={LABEL} htmlFor="pc-name">Name (optional)</label>
          <input id="pc-name" type="text" className={INPUT}
            value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken breast" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={clear}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Clear
          </button>
          <button type="button" onClick={copy} disabled={!result}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
            {copied ? 'Copied!' : 'Copy result'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`${CARD} flex flex-col gap-3`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">{summary}</p>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${label.cls}`}>{label.text}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ['Protein per kcal', fmt(result.ratio, 3)],
              ['Protein per 100 kcal', `${fmt(result.per100)} g`],
              ['Calories per g protein', `${fmt(result.kcalPerGram, 1)}`],
            ].map(([lbl, val]) => (
              <div key={lbl} className="rounded-xl bg-gray-50 dark:bg-[var(--color-bg-subtle)] p-3 text-center">
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{lbl}</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
        <p><strong>0.20 or higher</strong> per kcal = very high protein · <strong>0.10–0.19</strong> = moderate · <strong>below 0.10</strong> = low (calorie dense).</p>
        <p>Have kilojoules? Divide by 4.184 to get kcal, or use the Kilojoule Converter.</p>
      </div>
    </div>
  );
}
