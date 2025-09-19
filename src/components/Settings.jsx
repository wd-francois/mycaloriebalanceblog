import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext.jsx';

const Settings = ({ onClose = null }) => {
  const [isClient, setIsClient] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    weightUnit: 'lbs',
    lengthUnit: 'in',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });
  
  useEffect(() => {
    setIsClient(true);
    
    // Load settings from localStorage on mount
    const savedSettings = localStorage.getItem('healthTrackerSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setLocalSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Try to use context if available, otherwise use local state
  let settings, updateSetting;
  try {
    if (isClient) {
      const context = useSettings();
      settings = context.settings;
      updateSetting = context.updateSetting;
    }
  } catch (error) {
    console.log('Settings context not available, using local state');
    settings = localSettings;
    updateSetting = (key, value) => {
      setLocalSettings(prev => {
        const newSettings = { ...prev, [key]: value };
        localStorage.setItem('healthTrackerSettings', JSON.stringify(newSettings));
        return newSettings;
      });
    };
  }

  // Use local settings if context is not available
  if (!settings) {
    settings = localSettings;
    updateSetting = (key, value) => {
      setLocalSettings(prev => {
        const newSettings = { ...prev, [key]: value };
        localStorage.setItem('healthTrackerSettings', JSON.stringify(newSettings));
        return newSettings;
      });
    };
  }

  // Show loading state if not on client side yet
  if (!isClient) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  const unitOptions = {
    weightUnit: [
      { value: 'lbs', label: 'Pounds (lbs)' },
      { value: 'kg', label: 'Kilograms (kg)' }
    ],
    lengthUnit: [
      { value: 'in', label: 'Inches (in)' },
      { value: 'cm', label: 'Centimeters (cm)' }
    ],
    dateFormat: [
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }
    ],
    timeFormat: [
      { value: '12h', label: '12-hour (AM/PM)' },
      { value: '24h', label: '24-hour' }
    ]
  };

  const settingGroups = [
    {
      title: 'Weight & Measurements',
      settings: [
        { key: 'weightUnit', label: 'Weight Unit', description: 'Unit for body weight measurements' },
        { key: 'lengthUnit', label: 'Length Unit', description: 'Unit for body measurements (neck, chest, etc.)' }
      ]
    },
    {
      title: 'Date & Time',
      settings: [
        { key: 'dateFormat', label: 'Date Format', description: 'How dates are displayed' },
        { key: 'timeFormat', label: 'Time Format', description: 'How times are displayed' }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
          <div className="flex items-center gap-2">
            <a
              href="/food_logger/"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              Back to Food Logger
            </a>
            <button
              onClick={() => {
                if (onClose && typeof onClose === 'function') {
                  onClose();
                } else {
                  // Fallback: go back in browser history
                  window.history.back();
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
      </div>

      <div className="space-y-8">
        {settingGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="border-b border-gray-200 pb-6 last:border-b-0">
            <h4 className="text-lg font-medium text-gray-900 mb-4">{group.title}</h4>
            <div className="space-y-4">
              {group.settings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="ml-4">
                    <select
                      value={settings[setting.key]}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {unitOptions[setting.key].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Settings Saved Automatically
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Your preferences are automatically saved and will be applied to all forms and displays throughout the application.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
