import { useState } from 'react';
import { INPUT, LABEL, CARD } from './styles';

// Pro's own copy of the Original app's /kilojoule-converter/ page.

const KJ_PER_KCAL = 4.184;
const QUICK_KJ = [100, 500, 1000, 2000];

const round = (n) => String(Math.round(n * 100) / 100);

export default function KilojouleConverterTool() {
  const [kj, setKj]     = useState('');
  const [kcal, setKcal] = useState('');

  const fromKj = (value) => {
    setKj(value);
    const n = parseFloat(value);
    setKcal(value === '' || isNaN(n) || n < 0 ? '' : round(n / KJ_PER_KCAL));
  };

  const fromKcal = (value) => {
    setKcal(value);
    const n = parseFloat(value);
    setKj(value === '' || isNaN(n) || n < 0 ? '' : round(n * KJ_PER_KCAL));
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className={`${CARD} flex flex-col gap-4`}>
        <div>
          <label className={LABEL} htmlFor="kj-input">Kilojoules (kJ)</label>
          <input id="kj-input" type="number" min="0" step="0.01" className={INPUT + ' text-lg font-semibold'}
            value={kj} onChange={e => fromKj(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={LABEL} htmlFor="kcal-input">Calories (kcal)</label>
          <input id="kcal-input" type="number" min="0" step="0.01" className={INPUT + ' text-lg font-semibold'}
            value={kcal} onChange={e => fromKcal(e.target.value)} placeholder="0" />
        </div>

        <div>
          <p className={LABEL}>Quick convert (kJ)</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_KJ.map(v => (
              <button key={v} type="button" onClick={() => fromKj(String(v))}
                className="py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors">
                {v}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => { setKj(''); setKcal(''); }}
          className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Clear
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        1 kcal = 4.184 kJ, and 1 kJ ≈ 0.239 kcal. Food labels in Australia and New Zealand usually list energy in kJ.
      </p>
    </div>
  );
}
