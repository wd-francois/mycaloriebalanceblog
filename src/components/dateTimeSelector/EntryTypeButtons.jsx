import { formatDateLocalYYYYMMDD } from '../../lib/dateUtils';

// ── Select Entry Type — Meal/Sleep/Measurements navigate to their own pages;
// Exercise opens inline (see ExerciseSection.jsx) ─────────────────────────────
export default function EntryTypeButtons({
  settings,
  selectedDate,
  formState,
  setFormState,
  setActiveForm,
  showActivityInput,
  setShowActivityInput,
  setShowModal,
}) {
  return (
    <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/70 bg-gray-50/90 dark:bg-slate-950/70 p-4">
      <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select Entry Type</div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Choose what you'd like to track and log it in seconds.</p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {settings.enableMeals && (
          <a
            href={selectedDate ? `/add-meal?date=${formatDateLocalYYYYMMDD(selectedDate)}` : '/add-meal'}
            className="group relative py-4 md:py-5 rounded-[1.75rem] text-sm md:text-base overflow-hidden transition-all duration-300 flex flex-col items-center justify-center min-h-[4rem] w-full focus:outline-none border-2 border-transparent bg-white dark:bg-gray-900/90 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5 no-underline"
          >
            <div className="relative z-10 flex flex-col items-center gap-3 text-gray-700 dark:text-gray-200">
              <div className="w-12 h-12 rounded-3xl flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <span className="text-2xl md:text-3xl">🍽️</span>
              </div>
              <span>Meal</span>
            </div>
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setActiveForm('exercise');
            const base = { id: null, name: '', type: 'exercise', notes: '', durationMinutes: '', photo: null };
            const sets = (formState.sets && formState.sets.length > 0) ? formState.sets : [{ reps: '', load: '' }];
            setFormState((prev) => ({ ...prev, ...base, sets }));
            setShowActivityInput(true);
            setShowModal(true);
          }}
          className={`group relative py-4 md:py-5 rounded-[1.75rem] text-sm md:text-base overflow-hidden transition-all duration-300 flex flex-col items-center justify-center min-h-[4rem] w-full focus:outline-none border-2 ${showActivityInput ? 'border-blue-500 bg-white shadow-[0_20px_45px_-30px_rgba(59,130,246,0.8)]' : 'border-transparent bg-white dark:bg-gray-900/90 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5'}`}
        >
          <div className={`relative z-10 flex flex-col items-center gap-3 ${showActivityInput ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
            <div className={`w-12 h-12 rounded-3xl flex items-center justify-center ${showActivityInput ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <span className="text-2xl md:text-3xl">🏃</span>
            </div>
            <span>Exercise</span>
          </div>
        </button>
        {settings.enableSleep !== false && (
          <button
            type="button"
            onClick={() => {
              const dateStr = selectedDate ? formatDateLocalYYYYMMDD(selectedDate) : formatDateLocalYYYYMMDD(new Date());
              window.location.href = `/add-sleep?date=${dateStr}`;
            }}
            className="group relative py-4 md:py-5 rounded-[1.75rem] text-sm md:text-base overflow-hidden transition-all duration-300 flex flex-col items-center justify-center min-h-[4rem] w-full focus:outline-none border-2 border-transparent bg-white dark:bg-gray-900/90 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5"
          >
            <div className="relative z-10 flex flex-col items-center gap-3 text-gray-700 dark:text-gray-200">
              <div className="w-12 h-12 rounded-3xl flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <span className="text-2xl md:text-3xl">🛌</span>
              </div>
              <span>Sleep</span>
            </div>
          </button>
        )}
        {settings.enableMeasurements && (
          <button
            type="button"
            onClick={() => {
              const dateStr = selectedDate ? formatDateLocalYYYYMMDD(selectedDate) : formatDateLocalYYYYMMDD(new Date());
              window.location.assign(`/add-measurement?date=${dateStr}`);
            }}
            className="group relative py-4 md:py-5 rounded-[1.75rem] text-sm md:text-base overflow-hidden transition-all duration-300 flex flex-col items-center justify-center min-h-[4rem] w-full focus:outline-none border-2 border-transparent bg-white dark:bg-gray-900/90 shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5"
          >
            <div className="relative z-10 flex flex-col items-center gap-3 text-gray-700 dark:text-gray-200">
              <div className="w-12 h-12 rounded-3xl flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <span className="text-2xl md:text-3xl">📏</span>
              </div>
              <span>Measure</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
