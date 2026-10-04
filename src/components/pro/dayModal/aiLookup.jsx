// ── AI nutrition lookup ────────────────────────────────────────────────────────
// Opens the AI assistant chosen in Pro Settings (ChatGPT, Claude, …) in a new
// tab with the user's prompt template filled in from a meal. Shared by the meal
// form and the meal entry card. Entries store fats as `fat`; the prompt
// template calls it `fats`.
export function openAINutritionLookup({ generateAIPrompt, getAIServiceUrl }, meal) {
  const prompt = generateAIPrompt({
    name:     meal.name,
    amount:   meal.amount,
    calories: meal.calories,
    protein:  meal.protein,
    carbs:    meal.carbs,
    fats:     meal.fat,
    fibre:    meal.fibre,
    sodium:   meal.sodium,
    other:    meal.other,
  });
  window.open(getAIServiceUrl(prompt), '_blank', 'noopener');
}

// Light-bulb icon, matching the Original app's AI button.
export function AIIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
