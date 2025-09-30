import React, { createContext, useContext, useState, useEffect } from 'react';

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
    enableExercise: true,
    enableSleep: true,
    enableMeasurements: true,
    // Theme
    theme: 'light'
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

  const value = {
    settings,
    updateSetting,
    updateSettings,
    convertWeight,
    convertLength,
    convertSkinfold
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
