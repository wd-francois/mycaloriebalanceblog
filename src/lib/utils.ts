import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Default AI prompt generator for meal entries
 */
export function defaultGenerateAIPrompt(mealData: any) {
  const { name, amount, calories, protein, carbs, fats, fibre, other } = mealData;
  return `I have a meal entry for "${name || 'Unknown Meal'}" with amount: ${amount || 'not specified'}. 

Current nutritional values:
- Calories: ${calories || 'not specified'}
- Protein: ${protein || 'not specified'}g
- Carbs: ${carbs || 'not specified'}g
- Fats: ${fats || 'not specified'}g
- Fibre: ${fibre || 'not specified'}g
- Other: ${other || 'not specified'}

Please provide accurate nutritional information for this meal. Include:
1. Calories per serving
2. Protein content in grams
3. Carbohydrates content in grams
4. Fats content in grams
5. Fibre content in grams
6. Any additional nutritional insights

Please format your response clearly so I can easily update my meal entry.`;
}

/**
 * Default AI service URL generator
 */
export function defaultGetAIServiceUrl(prompt: string) {
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://chat.openai.com/?q=${encodedPrompt}`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | null | undefined) {
  return date?.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

/**
 * Format time object to string (e.g., "12:30 PM")
 */
export function formatTime({ hour, minute, period }: { hour: number | string, minute: number | string, period: string }) {
  const mm = minute.toString().padStart(2, '0');
  return `${hour}:${mm} ${period}`;
}
