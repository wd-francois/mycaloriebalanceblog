import AutocompleteInput from '../AutocompleteInput';
import TimePicker from '../TimePicker';

// ── Meal Form Fields — inline within the Add/Edit modal (add or edit a meal) ──
export default function MealFormFields({
  selectedDate,
  setShowMealInput,
  setActiveForm,
  time,
  setTime,
  formState,
  setFormState,
  handleAutocompleteSelect,
  mealLibPh,
  handleSubmit,
  setShowExerciseInput,
  setShowSleepInput,
  setShowMeasurementsInput,
}) {
  return (
    <div className="pt-6 px-4 pb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Add Meal</h4>
          {selectedDate && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Date: {selectedDate.toLocaleDateString()}</p>
          )}
        </div>
        <button
          onClick={() => {
            setShowMealInput(false);
            setActiveForm('meal');
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        {/* Time Picker */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Time
          </label>
          <TimePicker
            value={time}
            onChange={(newTime) => setTime(newTime)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-name">
            Meal Name
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <AutocompleteInput
                type="food"
                value={formState.name}
                onChange={(value) => setFormState((s) => ({ ...s, name: value }))}
                onSelect={handleAutocompleteSelect}
                placeholder={mealLibPh.mealNamePlaceholder}
                autoFocus
                id="meal-name"
                className="dark:border-gray-600 dark:bg-[var(--color-bg-subtle)] dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-amount">
            Amount
          </label>
          <input
            id="meal-amount"
            type="text"
            list="meal-amount-datalist"
            autoComplete="off"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder={mealLibPh.mealAmountPlaceholder}
            value={formState.amount}
            onChange={(e) => setFormState((s) => ({ ...s, amount: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />
          <datalist id="meal-amount-datalist">
            {mealLibPh.mealAmountOptions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>

        {/* Nutrition Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-calories">
              Calories
            </label>
            <input
              id="meal-calories"
              type="number"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder={mealLibPh.mealCaloriesPlaceholder}
              value={formState.calories}
              onChange={(e) => setFormState((s) => ({ ...s, calories: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-protein">
              Protein (g)
            </label>
            <input
              id="meal-protein"
              type="number"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder={mealLibPh.mealProteinPlaceholder}
              value={formState.protein}
              onChange={(e) => setFormState((s) => ({ ...s, protein: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-carbs">
              Carbs (g)
            </label>
            <input
              id="meal-carbs"
              type="number"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder={mealLibPh.mealCarbsPlaceholder}
              value={formState.carbs}
              onChange={(e) => setFormState((s) => ({ ...s, carbs: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-fats">
              Fats (g)
            </label>
            <input
              id="meal-fats"
              type="number"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder={mealLibPh.mealFatsPlaceholder}
              value={formState.fats}
              onChange={(e) => setFormState((s) => ({ ...s, fats: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-fibre">
              Fibre (g)
            </label>
            <input
              id="meal-fibre"
              type="number"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder={mealLibPh.mealFibrePlaceholder}
              value={formState.fibre}
              onChange={(e) => setFormState((s) => ({ ...s, fibre: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-other">
              Other
            </label>
            <input
              id="meal-other"
              type="text"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder={mealLibPh.mealOtherPlaceholder}
              value={formState.other}
              onChange={(e) => setFormState((s) => ({ ...s, other: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, time, selectedDate, { setShowMealInput, setShowExerciseInput, setShowSleepInput, setShowMeasurementsInput })}
            className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {formState.id == null ? 'Add Meal Entry' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMealInput(false);
            }}
            className="inline-flex items-center px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95"
          >
            {formState.id == null ? 'Cancel' : 'Cancel Edit'}
          </button>
        </div>
      </div>
    </div>
  );
}
