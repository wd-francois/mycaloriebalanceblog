/**
 * ConvexSettingsContext — same API as SettingsContext but uses a separate
 * localStorage key ('mcb_pro_settings') so Pro settings don't clash with
 * the Original app's settings.
 *
 * All settings live in localStorage; Convex sync (weightUnit, calorieGoal)
 * can be layered on top later without changing the API.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ConvexSettingsContext = createContext();

const LS_KEY = 'mcb_pro_settings';

const DEFAULT_SETTINGS = {
  weightUnit: 'kg',
  lengthUnit: 'cm',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  enableMeals: true,
  enableExercise: true,
  enableSleep: true,
  enableMeasurements: true,
  theme: 'light',
  calorieGoal: 'none',        // 'none' | 'weightLoss' | 'maintenance' | 'weightGain'
  calorieGoalNumber: null,    // numeric daily kcal target (Pro-specific)
  aiService: 'chatgpt',
  aiPromptTemplate: `I have a meal entry for "{mealName}" with amount: {amount}.

Current nutritional values:
- Calories: {calories}
- Protein: {protein}g
- Carbs: {carbs}g
- Fats: {fats}g
- Fibre: {fibre}g

Please provide accurate nutritional information for this meal. Include:
1. Calories per serving
2. Protein content in grams
3. Carbohydrates content in grams
4. Fats content in grams
5. Any additional nutritional insights

Please format your response clearly so I can easily update my meal entry.`,
  aiCustomUrl: '',
  aiIncludeCurrentValues: true,
  aiRequestFormat: 'detailed',
  aiLanguage: 'english',
};

export const useConvexSettings = () => {
  const context = useContext(ConvexSettingsContext);
  if (!context) {
    console.warn('useConvexSettings called outside ConvexSettingsProvider, using defaults');
    return {
      settings: DEFAULT_SETTINGS,
      updateSetting: () => {},
      updateSettings: () => {},
      convertWeight: (v) => v,
      convertLength: (v) => v,
      convertSkinfold: (v) => v,
      generateAIPrompt: () => '',
      getAIServiceUrl: () => '',
    };
  }
  return context;
};

// Also export as useSettings so the Original's form hooks work unchanged
export const useSettings = useConvexSettings;

export const ConvexSettingsProvider = ({ children }) => {
  const [settings, setSettings]         = useState(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
    setIsInitialized(true);
  }, [isInitialized]);

  // Persist to localStorage on every change
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, isInitialized]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  // Conversion helpers (identical to Original)
  const convertWeight = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'lbs' && toUnit === 'kg') return value * 0.453592;
    if (fromUnit === 'kg'  && toUnit === 'lbs') return value / 0.453592;
    return value;
  };

  const convertLength = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'in' && toUnit === 'cm') return value * 2.54;
    if (fromUnit === 'cm' && toUnit === 'in') return value / 2.54;
    return value;
  };

  const convertSkinfold = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'mm' && toUnit === 'cm') return value / 10;
    if (fromUnit === 'cm' && toUnit === 'mm') return value * 10;
    return value;
  };

  const generateAIPrompt = (mealData) => {
    const { name, amount, calories, protein, carbs, fats, fibre, other } = mealData;
    return settings.aiPromptTemplate
      .replace(/{mealName}/g, name    || 'Unknown Meal')
      .replace(/{amount}/g,   amount  || 'not specified')
      .replace(/{calories}/g, calories|| 'not specified')
      .replace(/{protein}/g,  protein || 'not specified')
      .replace(/{carbs}/g,    carbs   || 'not specified')
      .replace(/{fats}/g,     fats    || 'not specified')
      .replace(/{fibre}/g,    fibre   || 'not specified')
      .replace(/{other}/g,    other   || 'not specified');
  };

  const getAIServiceUrl = (prompt) => {
    const encoded = encodeURIComponent(prompt);
    switch (settings.aiService) {
      case 'claude':  return `https://claude.ai/?q=${encoded}`;
      case 'gemini':  return `https://gemini.google.com/?q=${encoded}`;
      case 'grok':    return `https://x.com/i/grok?q=${encoded}`;
      case 'custom':  return settings.aiCustomUrl ? `${settings.aiCustomUrl}${encoded}` : `https://chat.openai.com/?q=${encoded}`;
      default:        return `https://chat.openai.com/?q=${encoded}`;
    }
  };

  const value = useMemo(() => ({
    settings,
    updateSetting,
    updateSettings,
    convertWeight,
    convertLength,
    convertSkinfold,
    generateAIPrompt,
    getAIServiceUrl,
  }), [settings, updateSetting, updateSettings]);

  return (
    <ConvexSettingsContext.Provider value={value}>
      {children}
    </ConvexSettingsContext.Provider>
  );
};
