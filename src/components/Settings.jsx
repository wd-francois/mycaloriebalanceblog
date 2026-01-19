import { useState, useEffect } from 'react';
import { useSettings, SettingsProvider } from '../contexts/SettingsContext.jsx';

// Custom CSS for responsive radio buttons and toggle switches
const radioStyles = `
  .responsive-radio {
    width: 14px !important;
    height: 14px !important;
    min-width: 14px !important;
    min-height: 14px !important;
  }
  
  @media (min-width: 640px) {
    .responsive-radio {
      width: 16px !important;
      height: 16px !important;
      min-width: 16px !important;
      min-height: 16px !important;
    }
  }
  
  .responsive-toggle {
    width: 2.5rem !important;
    height: 1.25rem !important;
  }
  
  .responsive-toggle::after {
    width: 0.875rem !important;
    height: 0.875rem !important;
  }
  
  @media (min-width: 640px) {
    .responsive-toggle {
      width: 2.75rem !important;
      height: 1.5rem !important;
    }
    
    .responsive-toggle::after {
      width: 1.25rem !important;
      height: 1.25rem !important;
    }
  }
`;

const Settings = ({ onClose: _onClose = null }) => {
  // Only initialize hooks if we're on the client side
  const [isClient, setIsClient] = useState(false);
  
  // Use settings from context
  const { settings, updateSetting } = useSettings();

  // Debug: Log updateSetting on mount
  useEffect(() => {
    console.log('Settings component - updateSetting type:', typeof updateSetting, 'value:', updateSetting);
  }, [updateSetting]);

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side before doing anything
    if (typeof window === 'undefined') return;

    setIsClient(true);
  }, []);

  // Check theme on mount and when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Debug: Log when settings change
  useEffect(() => {
    console.log('Settings changed:', settings);
  }, [settings]);

  // updateSetting is now from context, no need to redefine

  // Dark mode toggle handler
  const handleThemeToggle = () => {
    if (typeof window === 'undefined') return;

    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // Show loading state if not on client side yet or settings not loaded
  if (!isClient || !settings) {
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
    ],
    aiService: [
      { value: 'chatgpt', label: 'ChatGPT' },
      { value: 'claude', label: 'Claude AI' },
      { value: 'gemini', label: 'Google Gemini' },
      { value: 'grok', label: 'Grok (X)' },
      { value: 'custom', label: 'Custom URL' }
    ],
    aiRequestFormat: [
      { value: 'detailed', label: 'Detailed (Full prompt)' },
      { value: 'simple', label: 'Simple (Basic request)' },
      { value: 'custom', label: 'Custom Template' }
    ],
    aiLanguage: [
      { value: 'english', label: 'English' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'french', label: 'French' },
      { value: 'german', label: 'German' },
      { value: 'portuguese', label: 'Portuguese' }
    ]
  };

  // Get default value based on setting key
  const getDefaultValue = (key) => {
    const defaults = {
      weightUnit: 'kg',
      lengthUnit: 'cm',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      aiService: 'chatgpt',
      aiRequestFormat: 'detailed',
      aiLanguage: 'english'
    };
    return defaults[key] || '';
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
    },
    {
      title: 'AI Assistant',
      settings: [
        { key: 'aiService', label: 'AI Service', description: 'Choose which AI service to use for nutrition queries' },
        { key: 'aiRequestFormat', label: 'Request Format', description: 'How detailed the AI prompt should be' },
        { key: 'aiLanguage', label: 'Language', description: 'Language for AI responses' },
        { key: 'aiIncludeCurrentValues', label: 'Include Current Values', description: 'Include existing nutritional values in AI prompt', type: 'toggle' }
      ]
    }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: radioStyles }} />
      <div className="bg-white dark:bg-[var(--color-bg-muted)] rounded-lg shadow-lg p-4 sm:p-6 max-w-4xl mx-auto">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">App Settings</h4>

        {/* Dark Mode Toggle */}
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dark Mode
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
            <button
              onClick={handleThemeToggle}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--color-bg-subtle)] hover:bg-gray-50 dark:hover:bg-[var(--color-bg-muted)] transition-all duration-200 text-gray-700 dark:text-gray-300"
            >
              {/* Moon icon (light mode) */}
              <svg
                className={`w-5 h-5 ${!isDarkMode ? 'text-gray-700' : 'hidden'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              {/* Sun icon (dark mode) */}
              <svg
                className={`w-5 h-5 text-amber-500 ${isDarkMode ? '' : 'hidden'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span className="text-sm font-medium">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {settingGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{group.title}</h4>
              <div className="space-y-4">
                {group.settings.map((setting) => {
                  const currentValue = settings[setting.key] || getDefaultValue(setting.key);
                  console.log(`Rendering setting ${setting.key} with value:`, currentValue);
                  return (
                    <div key={setting.key}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {setting.label}
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{setting.description}</p>
                      </div>
                      <div className="sm:ml-4 flex justify-end sm:justify-start">
                        {setting.type === 'toggle' ? (
                          /* Toggle Switch */
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings[setting.key] || false}
                              onChange={(e) => updateSetting(setting.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="responsive-toggle bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        ) : unitOptions[setting.key] ? (
                          <>
                            {/* Mobile: Checkboxes */}
                            <div className="flex flex-wrap gap-2 sm:hidden">
                              {unitOptions[setting.key].map((option) => (
                                <label key={option.value} className="flex items-center gap-1 text-sm cursor-pointer">
                                  <input
                                    type="radio"
                                    name={setting.key}
                                    value={option.value}
                                    checked={(settings[setting.key] || getDefaultValue(setting.key)) === option.value}
                                    onChange={(e) => {
                                      console.log('Updating setting:', setting.key, 'to:', e.target.value);
                                      updateSetting(setting.key, e.target.value);
                                    }}
                                    className="responsive-radio text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-xs">{option.label}</span>
                                </label>
                              ))}
                            </div>

                            {/* Desktop: Select dropdown */}
                            <select
                              id={`select-${setting.key}`}
                              value={settings?.[setting.key] ?? getDefaultValue(setting.key)}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('Select onChange - setting:', setting.key, 'current:', settings?.[setting.key], 'new value:', newValue);
                                console.log('updateSetting:', updateSetting, 'type:', typeof updateSetting);
                                
                                // Call updateSetting directly - it should always be available from context
                                if (typeof updateSetting === 'function') {
                                  console.log('Calling updateSetting with:', setting.key, newValue);
                                  updateSetting(setting.key, newValue);
                                  console.log('updateSetting call completed');
                                } else {
                                  console.error('updateSetting is not a function!', updateSetting);
                                }
                              }}
                              className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] w-full sm:w-auto text-sm bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white cursor-pointer"
                            >
                              {unitOptions[setting.key]?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <div className="text-sm text-red-500">Options not available for {setting.key}</div>
                        )}
                      </div>
                      </div>
                      {/* Custom URL Input - Show directly below AI Service */}
                      {setting.key === 'aiService' && settings.aiService === 'custom' && (
                        <div className="mt-4 ml-0 sm:ml-0">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom AI Service URL
                          </label>
                          <p className="text-sm text-gray-500 mb-3">Enter the base URL for your custom AI service. The prompt will be appended as a query parameter.</p>
                          <input
                            type="url"
                            value={settings.aiCustomUrl}
                            onChange={(e) => updateSetting('aiCustomUrl', e.target.value)}
                            placeholder="https://your-ai-service.com/?q="
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Custom AI Settings */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Custom AI Settings</h4>

          {/* Custom Prompt Template Editor */}
          {settings.aiRequestFormat === 'custom' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Prompt Template
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Use placeholders: {'{mealName}'}, {'{amount}'}, {'{calories}'}, {'{protein}'}, {'{carbs}'}, {'{fats}'}, {'{fibre}'}, {'{other}'}
              </p>
              <textarea
                value={settings.aiPromptTemplate}
                onChange={(e) => updateSetting('aiPromptTemplate', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter your custom prompt template..."
              />
            </div>
          )}

          {/* Prompt Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Prompt Preview</h5>
            <p className="text-xs text-gray-500 mb-3">This is how your AI prompt will look with sample data:</p>
            <div className="bg-white border border-gray-200 rounded p-3 text-sm font-mono text-gray-700 whitespace-pre-wrap">
              {settings.aiPromptTemplate
                .replace(/{mealName}/g, 'Chicken Breast')
                .replace(/{amount}/g, '200g')
                .replace(/{calories}/g, 'not specified')
                .replace(/{protein}/g, 'not specified')
                .replace(/{carbs}/g, 'not specified')
                .replace(/{fats}/g, 'not specified')
                .replace(/{fibre}/g, 'not specified')}
            </div>
          </div>
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
    </>
  );
};

// Export the Settings component for use with provider
export { Settings };

// Wrapper component that includes the provider
const SettingsWithProvider = () => {
  return (
    <SettingsProvider>
      <Settings />
    </SettingsProvider>
  );
};

export default SettingsWithProvider;
