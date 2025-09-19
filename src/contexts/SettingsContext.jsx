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
    weightUnit: 'lbs', // 'lbs' or 'kg'
    lengthUnit: 'in', // 'in' or 'cm'
    dateFormat: 'MM/DD/YYYY', // 'MM/DD/YYYY' or 'DD/MM/YYYY'
    timeFormat: '12h' // '12h' or '24h'
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('healthTrackerSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('healthTrackerSettings', JSON.stringify(settings));
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
