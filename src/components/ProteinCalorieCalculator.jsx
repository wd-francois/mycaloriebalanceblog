import React, { useState } from 'react';

const ProteinCalorieCalculator = () => {
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [itemName, setItemName] = useState('');
  const [result, setResult] = useState(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy result');

  const formatNumber = (n, dec = 2) => {
    if (!isFinite(n)) return '—';
    return Number(n).toFixed(dec).replace(/\.00$/, '');
  };

  const interpretRatio = (r) => {
    if (r >= 0.2) return { text: 'Very high protein', color: 'bg-emerald-100 border-emerald-200 text-emerald-700' };
    if (r >= 0.1) return { text: 'Moderate protein', color: 'bg-amber-100 border-amber-200 text-amber-700' };
    return { text: 'Low protein', color: 'bg-rose-100 border-rose-200 text-rose-700' };
  };

  const handleCalculate = () => {
    const proteinVal = parseFloat(protein);
    const caloriesVal = parseFloat(calories);

    // Validation
    if (isNaN(proteinVal) || isNaN(caloriesVal) || caloriesVal <= 0) {
      alert('Please enter valid numbers for protein (g) and calories (kcal). Calories must be greater than zero.');
      return;
    }

    const ratio = proteinVal / caloriesVal; // protein per kcal
    const per100 = ratio * 100; // protein per 100 kcal
    const kcalPerGram = caloriesVal / proteinVal; // calories per gram protein

    const interp = interpretRatio(ratio);

    setResult({
      ratio,
      per100,
      kcalPerGram,
      interpretation: interp,
      protein: proteinVal,
      calories: caloriesVal,
      name: itemName.trim()
    });
  };

  const handleClear = () => {
    setProtein('');
    setCalories('');
    setItemName('');
    setResult(null);
  };

  const handleCopy = async () => {
    if (!result) {
      alert('No result to copy. Calculate first.');
      return;
    }

    const itemText = result.name 
      ? `${result.name} — ${result.protein} g protein · ${result.calories} kcal`
      : `${result.protein} g protein · ${result.calories} kcal`;
    
    const text = `${itemText}\nProtein per kcal: ${formatNumber(result.ratio, 3)}\nProtein per 100 kcal: ${formatNumber(result.per100, 2)} g\nCalories per g protein: ${formatNumber(result.kcalPerGram, 1)} kcal/g\n(${result.interpretation.text})`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy result'), 1500);
    } catch (e) {
      alert('Copy failed. You can select the text and copy manually.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Protein → Calorie Calculator
            </h2>
          </div>
          <p className="text-blue-50 text-sm md:text-base">
            Quickly check protein per calorie (and per 100 kcal) for foods or recipes
          </p>
        </div>

        {/* Form Content */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Protein <span className="text-gray-500 font-normal">(grams)</span>
              </label>
              <div className="relative group">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 25"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-5 py-4 pr-16 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-100 focus:border-sky-500 text-lg font-semibold text-gray-900 transition-all duration-200 group-hover:border-gray-300"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                  g
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Enter total protein in grams for the serving or item.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Calories <span className="text-gray-500 font-normal">(kcal)</span>
              </label>
              <div className="relative group">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 250"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-5 py-4 pr-16 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-lg font-semibold text-gray-900 transition-all duration-200 group-hover:border-gray-300"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                  kcal
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Enter calories (kilocalories). If you have kJ, divide by 4.184 first.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Name <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Chicken breast"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-base font-semibold text-gray-900 transition-all duration-200 hover:border-gray-300"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCalculate}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold shadow-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Calculate
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200"
            >
              Clear
            </button>
            <button
              onClick={handleCopy}
              className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copyButtonText}
            </button>
          </div>

          {result && (
            <div className="mt-6 bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200 p-6 rounded-xl animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Result</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.name 
                      ? `${result.name} — ${result.protein} g protein · ${result.calories} kcal`
                      : `${result.protein} g protein · ${result.calories} kcal`}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold inline-block px-3 py-1 rounded-full ${result.interpretation.color}`}>
                    {result.interpretation.text}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <div className="p-4 bg-white rounded-xl border-2 border-gray-100 text-center shadow-sm">
                  <div className="text-xs text-gray-500 font-medium mb-1">Protein per calorie</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(result.ratio, 3)}</div>
                </div>
                <div className="p-4 bg-white rounded-xl border-2 border-gray-100 text-center shadow-sm">
                  <div className="text-xs text-gray-500 font-medium mb-1">Protein per 100 kcal</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(result.per100, 2)} g</div>
                </div>
                <div className="p-4 bg-white rounded-xl border-2 border-gray-100 text-center shadow-sm">
                  <div className="text-xs text-gray-500 font-medium mb-1">Calories per g protein</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(result.kcalPerGram, 1)} kcal/g</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                <strong className="text-sm text-gray-900">Interpretation:</strong>
                <ul className="list-disc list-inside mt-2 text-sm text-gray-700 space-y-1">
                  <li>0.20 or higher = very high-protein.</li>
                  <li>0.10–0.19 = moderate protein.</li>
                  <li>Below 0.10 = low protein (calorie dense).</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> You can enter calories in kJ by dividing kJ by 4.184 first. This tool uses kcal (food calories).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProteinCalorieCalculator;
