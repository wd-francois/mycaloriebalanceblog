import React, { useState, useEffect } from 'react';

const Settings = ({ onClose = null }) => {
  const [isClient, setIsClient] = useState(false);
  const [settings, setSettings] = useState({
    weightUnit: 'kg',
    lengthUnit: 'cm',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    enableMeals: true,
    enableExercise: false, // Temporarily disabled
    enableSleep: true,
    enableMeasurements: true,
    theme: 'light',
    // AI Settings
    aiService: 'chatgpt',
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
    aiCustomUrl: '',
    aiIncludeCurrentValues: true,
    aiRequestFormat: 'detailed',
    aiLanguage: 'english'
  });
  
  useEffect(() => {
    setIsClient(true);
    
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Load settings from localStorage on mount
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

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Only run on client side
      if (typeof window !== 'undefined') {
        localStorage.setItem('healthTrackerSettings', JSON.stringify(newSettings));
      }
      
      return newSettings;
    });
  };

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
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Settings</h3>
          <div className="flex items-center gap-2">
            <a
              href="/food-logger"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors min-h-[44px] flex items-center px-2"
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
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Close"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div key={setting.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="sm:ml-4">
                    {setting.type === 'toggle' ? (
                      /* Toggle Switch */
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[setting.key]}
                          onChange={(e) => updateSetting(setting.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    ) : (
                      <>
                        {/* Mobile: Checkboxes */}
                        <div className="flex flex-wrap gap-2 sm:hidden">
                          {unitOptions[setting.key].map((option) => (
                            <label key={option.value} className="flex items-center gap-1 text-sm">
                              <input
                                type="radio"
                                name={setting.key}
                                value={option.value}
                                checked={settings[setting.key] === option.value}
                                onChange={(e) => updateSetting(setting.key, e.target.value)}
                                className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-xs">{option.label}</span>
                            </label>
                          ))}
                        </div>
                        
                        {/* Desktop: Select dropdown */}
                        <select
                          value={settings[setting.key]}
                          onChange={(e) => updateSetting(setting.key, e.target.value)}
                          className="hidden sm:block px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] w-auto text-sm"
                        >
                          {unitOptions[setting.key].map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom AI Settings */}
      <div className="border-b border-gray-200 pb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Custom AI Settings</h4>
        
        {/* Custom URL Input */}
        {settings.aiService === 'custom' && (
          <div className="mb-6">
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

        {/* Custom Prompt Template Editor */}
        {settings.aiRequestFormat === 'custom' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Prompt Template
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Use placeholders: {'{mealName}'}, {'{amount}'}, {'{calories}'}, {'{protein}'}, {'{carbs}'}, {'{fats}'}
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
              .replace(/{fats}/g, 'not specified')}
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
  );
};


export default Settings;
