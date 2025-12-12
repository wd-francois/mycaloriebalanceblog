import { useState, useEffect } from 'react';

const KilojouleConverter = () => {
  const [kilojoules, setKilojoules] = useState('');
  const [calories, setCalories] = useState('');
  const [direction, setDirection] = useState('kj-to-cal'); // 'kj-to-cal' or 'cal-to-kj'
  const [isSwapping, setIsSwapping] = useState(false);

  // Conversion factor: 1 kilojoule = 0.239006 kilocalories (commonly rounded to 0.239)
  const KJ_TO_CAL = 0.239006;

  // Quick conversion presets
  const quickValues = [
    { label: '100', kj: 100 },
    { label: '500', kj: 500 },
    { label: '1000', kj: 1000 },
    { label: '2000', kj: 2000 },
  ];

  useEffect(() => {
    if (direction === 'kj-to-cal') {
      if (kilojoules === '' || kilojoules === null) {
        setCalories('');
        return;
      }
      const kj = parseFloat(kilojoules);
      if (!isNaN(kj) && kj >= 0) {
        const cal = kj * KJ_TO_CAL;
        setCalories(cal.toFixed(2));
      } else {
        setCalories('');
      }
    } else {
      if (calories === '' || calories === null) {
        setKilojoules('');
        return;
      }
      const cal = parseFloat(calories);
      if (!isNaN(cal) && cal >= 0) {
        const kj = cal / KJ_TO_CAL;
        setKilojoules(kj.toFixed(2));
      } else {
        setKilojoules('');
      }
    }
  }, [kilojoules, calories, direction]);

  const handleKilojoulesChange = (e) => {
    const value = e.target.value;
    setKilojoules(value);
    setDirection('kj-to-cal');
  };

  const handleCaloriesChange = (e) => {
    const value = e.target.value;
    setCalories(value);
    setDirection('cal-to-kj');
  };

  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 300);

    const tempKj = kilojoules;
    const tempCal = calories;
    setKilojoules(tempCal);
    setCalories(tempKj);
    setDirection(direction === 'kj-to-cal' ? 'cal-to-kj' : 'kj-to-cal');
  };

  const handleClear = () => {
    setKilojoules('');
    setCalories('');
  };

  const handleQuickValue = (kjValue) => {
    setKilojoules(kjValue.toString());
    setDirection('kj-to-cal');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Main Converter Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Energy Converter
            </h2>
          </div>
          <p className="text-blue-50 text-sm md:text-base">
            Convert between kilojoules and kilocalories instantly
          </p>
        </div>

        {/* Converter Content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Kilojoules Input */}
          <div className="transform transition-all duration-200 hover:scale-[1.01]">
            <label htmlFor="kilojoules" className="text-sm font-semibold text-gray-700 mb-3 block">
              Kilojoules <span className="text-gray-500 font-normal">(kJ)</span>
            </label>
            <div className="relative group">
              <input
                type="number"
                id="kilojoules"
                value={kilojoules}
                onChange={handleKilojoulesChange}
                placeholder="0"
                className="w-full px-5 py-4 pr-16 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-xl font-semibold text-gray-900 transition-all duration-200 group-hover:border-gray-300"
                min="0"
                step="0.01"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                kJ
              </span>
              {kilojoules && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2">
                  <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          {/* Swap Button with animation */}
          <div className="flex justify-center -my-2">
            <button
              onClick={handleSwap}
              className={`relative p-4 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 ${isSwapping ? 'rotate-180' : ''}`}
              title="Swap conversion direction"
              aria-label="Swap conversion direction"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <div className="absolute inset-0 rounded-2xl bg-white opacity-0 hover:opacity-20 transition-opacity"></div>
            </button>
          </div>

          {/* Calories Input */}
          <div className="transform transition-all duration-200 hover:scale-[1.01]">
            <label htmlFor="calories" className="text-sm font-semibold text-gray-700 mb-3 block">
              Calories <span className="text-gray-500 font-normal">(kcal)</span>
            </label>
            <div className="relative group">
              <input
                type="number"
                id="calories"
                value={calories}
                onChange={handleCaloriesChange}
                placeholder="0"
                className="w-full px-5 py-4 pr-16 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 text-xl font-semibold text-gray-900 transition-all duration-200 group-hover:border-gray-300"
                min="0"
                step="0.01"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                kcal
              </span>
              {calories && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2">
                  <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleClear}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>

            {kilojoules && calories && (
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-600 font-medium">Converted</span>
              </div>
            )}
          </div>

          {/* Conversion Result Card */}
          {kilojoules && calories && (
            <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-blue-200 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-blue-900">Conversion Result</span>
              </div>
              <p className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                <span className="text-blue-600">{parseFloat(kilojoules).toLocaleString()} kJ</span>
                {' '}<span className="text-gray-400">=</span>{' '}
                <span className="text-purple-600">{parseFloat(calories).toLocaleString()} kcal</span>
              </p>
              <p className="text-xs text-gray-600">
                Using conversion factor: 1 kJ = {KJ_TO_CAL.toFixed(6)} kcal
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Conversion Buttons */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Convert
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickValues.map((item) => (
            <button
              key={item.kj}
              onClick={() => handleQuickValue(item.kj)}
              className="px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-md"
            >
              {item.label} kJ
            </button>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">About the Conversion</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Both kilojoules (kJ) and kilocalories (kcal) measure food energy. Most food labels show values in both units.
              The scientific standard is kilojoules, while kilocalories (often called "calories") are commonly used in nutrition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KilojouleConverter;



