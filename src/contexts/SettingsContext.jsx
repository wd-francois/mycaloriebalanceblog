import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    weightUnit: 'kg', // 'lbs' or 'kg'
    lengthUnit: 'cm', // 'in' or 'cm'
    dateFormat: 'MM/DD/YYYY', // 'MM/DD/YYYY' or 'DD/MM/YYYY'
    timeFormat: '12h', // '12h' or '24h'
    // Feature toggles
    enableMeals: true,
    enableExercise: false, // Temporarily disabled
    enableSleep: true,
    enableMeasurements: true,
    // Theme
    theme: 'light',
    // AI Settings
    aiService: 'chatgpt', // 'chatgpt', 'claude', 'gemini', 'grok', 'custom'
    aiPromptTemplate: `I have a meal entry for "{mealName}" with amount: {amount}. 

Current nutritional values:
- Calories: {calories}
- Protein: {protein}g
- Carbs: {carbs}g
- Fats: {fats}g

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
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const savedSettings = localStorage.getItem('healthTrackerSettings');
    const healthEntries = localStorage.getItem('healthEntries');

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }

    // Load feature toggles from healthEntries if available
    if (healthEntries) {
      try {
        const parsed = JSON.parse(healthEntries);
        if (parsed.enableMeals !== undefined || parsed.enableExercise !== undefined ||
          parsed.enableSleep !== undefined || parsed.enableMeasurements !== undefined) {
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.error('Error loading health entries:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    localStorage.setItem('healthTrackerSettings', JSON.stringify(settings));

    // Also save feature toggles to healthEntries for compatibility
    const featureToggles = {
      enableMeals: settings.enableMeals,
      enableExercise: settings.enableExercise,
      enableSleep: settings.enableSleep,
      enableMeasurements: settings.enableMeasurements
    };

    const existingHealthEntries = JSON.parse(localStorage.getItem('healthEntries') || '{}');
    const updatedHealthEntries = { ...existingHealthEntries, ...featureToggles };
    localStorage.setItem('healthEntries', JSON.stringify(updatedHealthEntries));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

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
      prompt = prompt.replace(/Current nutritional values:\s*- Calories: [^\n]*\n- Protein: [^\n]*\n- Carbs: [^\n]*\n- Fats: [^\n]*\n\n/g, '');
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

  const value = {
    settings,
    updateSetting,
    updateSettings,
    convertWeight,
    convertLength,
    convertSkinfold,
    generateAIPrompt,
    getAIServiceUrl
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
