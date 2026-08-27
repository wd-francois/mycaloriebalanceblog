import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import healthDB from '../lib/database.js';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    // Return default settings instead of throwing error
    // This can happen during initial render or if provider isn't set up yet
    console.warn('useSettings called outside SettingsProvider, using defaults');
    return {
      settings: {
        weightUnit: 'kg',
        lengthUnit: 'cm',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        enableMeals: true,
        enableExercise: true,
        enableSleep: true,
        enableMeasurements: true,
        theme: 'light',
        calorieGoal: 'none',
        aiService: 'chatgpt',
        aiPromptTemplate: '',
        aiCustomUrl: '',
        aiIncludeCurrentValues: true,
        aiRequestFormat: 'detailed',
        aiLanguage: 'english'
      },
      updateSetting: () => {},
      updateSettings: () => {},
      convertWeight: (v, f, t) => v,
      convertLength: (v, f, t) => v,
      convertSkinfold: (v, f, t) => v,
      generateAIPrompt: () => '',
      getAIServiceUrl: () => ''
    };
  }
  return context;
};

const DEFAULT_SETTINGS = {
  weightUnit: 'kg', // 'lbs' or 'kg'
  lengthUnit: 'cm', // 'in' or 'cm'
  dateFormat: 'MM/DD/YYYY', // 'MM/DD/YYYY' or 'DD/MM/YYYY'
  timeFormat: '12h', // '12h' or '24h'
  // Feature toggles
  enableMeals: true,
  enableExercise: true,
  enableSleep: true,
  enableMeasurements: true,
  // Theme
  theme: 'light',
  // Calorie Goal
  calorieGoal: 'none', // 'none', 'weightLoss', 'maintenance', 'weightGain'
  // AI Settings
  aiService: 'chatgpt', // 'chatgpt', 'claude', 'gemini', 'grok', 'custom'
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
  aiCustomUrl: '', // For custom AI service
  aiIncludeCurrentValues: true, // Whether to include current nutritional values in prompt
  aiRequestFormat: 'detailed', // 'detailed', 'simple', 'custom'
  aiLanguage: 'english' // 'english', 'spanish', 'french', etc.
};

// Reads persisted settings synchronously so the first render already has the
// real calorieGoal etc. — previously this loaded via a useEffect, so every
// fresh page load rendered the 'none' default first and corrected a moment
// later, which could show as the Calorie Goal card flashing to "Choose your
// goal" before catching up.
function loadInitialSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  let merged = { ...DEFAULT_SETTINGS };

  try {
    const savedSettings = localStorage.getItem('healthTrackerSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      merged = { ...merged, ...parsed };
      // Migration: add Fibre line to existing AI prompt templates that have Fats but not Fibre
      if (merged.aiPromptTemplate && typeof merged.aiPromptTemplate === 'string') {
        const hasFats = /- Fats: \{fats\}g/i.test(merged.aiPromptTemplate);
        const hasFibre = /- Fibre: \{fibre\}g/i.test(merged.aiPromptTemplate);
        if (hasFats && !hasFibre) {
          merged = {
            ...merged,
            aiPromptTemplate: merged.aiPromptTemplate.replace(
              /(- Fats: \{fats\}g)/i,
              '$1\n- Fibre: {fibre}g'
            )
          };
        }
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  // Load feature toggles from healthEntries if present (same object also stores per-day entry arrays — never merge those into settings)
  try {
    const healthEntries = healthDB.getHealthEntries();
    const toggleKeys = ['enableMeals', 'enableExercise', 'enableSleep', 'enableMeasurements'];
    for (const key of toggleKeys) {
      if (healthEntries[key] !== undefined) merged[key] = healthEntries[key];
    }
  } catch (error) {
    console.error('Error loading health entries:', error);
  }

  return merged;
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(loadInitialSettings);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    console.log('Saving settings to localStorage:', settings);
    localStorage.setItem('healthTrackerSettings', JSON.stringify(settings));

    // Also save feature toggles to healthEntries for compatibility
    const featureToggles = {
      enableMeals: settings.enableMeals,
      enableExercise: settings.enableExercise,
      enableSleep: settings.enableSleep,
      enableMeasurements: settings.enableMeasurements
    };

    const existingHealthEntries = healthDB.getHealthEntries();
    const updatedHealthEntries = { ...existingHealthEntries, ...featureToggles };
    healthDB.saveHealthEntries(updatedHealthEntries);
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    console.log('updateSetting called:', key, '=', value);
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: value
      };
      console.log('New settings:', newSettings);
      return newSettings;
    });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  // Conversion functions
  const convertWeight = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;

    if (fromUnit === 'lbs' && toUnit === 'kg') {
      return value * 0.453592;
    } else if (fromUnit === 'kg' && toUnit === 'lbs') {
      return value / 0.453592;
    }
    return value;
  };

  const convertLength = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;

    if (fromUnit === 'in' && toUnit === 'cm') {
      return value * 2.54;
    } else if (fromUnit === 'cm' && toUnit === 'in') {
      return value / 2.54;
    }
    return value;
  };

  const convertSkinfold = (value, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return value;

    if (fromUnit === 'mm' && toUnit === 'cm') {
      return value / 10;
    } else if (fromUnit === 'cm' && toUnit === 'mm') {
      return value * 10;
    }
    return value;
  };

  // AI prompt generation function
  const generateAIPrompt = (mealData) => {
    const { name, amount, calories, protein, carbs, fats, fibre, other } = mealData;

    // Replace placeholders in the template
    let prompt = settings.aiPromptTemplate
      .replace(/{mealName}/g, name || 'Unknown Meal')
      .replace(/{amount}/g, amount || 'not specified')
      .replace(/{calories}/g, calories || 'not specified')
      .replace(/{protein}/g, protein || 'not specified')
      .replace(/{carbs}/g, carbs || 'not specified')
      .replace(/{fats}/g, fats || 'not specified')
      .replace(/{fibre}/g, fibre || 'not specified')
      .replace(/{other}/g, other || 'not specified');

    // If not including current values, remove that section
    if (!settings.aiIncludeCurrentValues) {
      prompt = prompt.replace(/Current nutritional values:\s*- Calories: [^\n]*\n- Protein: [^\n]*\n- Carbs: [^\n]*\n- Fats: [^\n]*\n- Fibre: [^\n]*\n\n/g, '');
    }

    return prompt;
  };

  // Get AI service URL
  const getAIServiceUrl = (prompt) => {
    const encodedPrompt = encodeURIComponent(prompt);

    switch (settings.aiService) {
      case 'chatgpt':
        return `https://chat.openai.com/?q=${encodedPrompt}`;
      case 'claude':
        return `https://claude.ai/?q=${encodedPrompt}`;
      case 'gemini':
        return `https://gemini.google.com/?q=${encodedPrompt}`;
      case 'grok':
        return `https://x.com/i/grok?q=${encodedPrompt}`;
      case 'custom':
        return settings.aiCustomUrl ? `${settings.aiCustomUrl}${encodedPrompt}` : `https://chat.openai.com/?q=${encodedPrompt}`;
      default:
        return `https://chat.openai.com/?q=${encodedPrompt}`;
    }
  };

  const value = useMemo(() => {
    console.log('Creating context value, updateSetting type:', typeof updateSetting);
    return {
      settings,
      updateSetting,
      updateSettings,
      convertWeight,
      convertLength,
      convertSkinfold,
      generateAIPrompt,
      getAIServiceUrl
    };
  }, [settings, updateSetting, updateSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
