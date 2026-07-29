import { useSettings } from '../../contexts/SettingsContext.jsx';

// ── Settings Modal ──────────────────────────────────────────────────────────
export default function SettingsModal({ onClose }) {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {!settings && (
            <div className="text-center py-4 text-gray-500">Loading settings...</div>
          )}
          {settings && (
            <div className="space-y-6">

              {/* Weight & Measurements */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Weight & Measurements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="weightUnit" className="block text-sm font-medium text-gray-700 mb-1">
                      Weight Unit
                    </label>

                    {/* Mobile: Radio buttons */}
                    <div className="flex gap-3 sm:hidden">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="weightUnit"
                          value="lbs"
                          checked={(settings.weightUnit || 'kg') === 'lbs'}
                          onChange={(e) => updateSetting('weightUnit', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">Pounds (lbs)</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="weightUnit"
                          value="kg"
                          checked={(settings.weightUnit || 'kg') === 'kg'}
                          onChange={(e) => updateSetting('weightUnit', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">Kilograms (kg)</span>
                      </label>
                    </div>

                    {/* Desktop: Select dropdown */}
                    <select
                      key={`weightUnit-${settings.weightUnit || 'kg'}`}
                      id="weightUnit"
                      value={settings.weightUnit || 'kg'}
                      onChange={(e) => updateSetting('weightUnit', e.target.value)}
                      className="hidden sm:block mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="lbs">Pounds (lbs)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lengthUnit" className="block text-sm font-medium text-gray-700 mb-1">
                      Length Unit (Girth)
                    </label>

                    {/* Mobile: Radio buttons */}
                    <div className="flex gap-3 sm:hidden">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="lengthUnit"
                          value="in"
                          checked={(settings.lengthUnit || 'cm') === 'in'}
                          onChange={(e) => updateSetting('lengthUnit', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">Inches (in)</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="lengthUnit"
                          value="cm"
                          checked={(settings.lengthUnit || 'cm') === 'cm'}
                          onChange={(e) => updateSetting('lengthUnit', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">Centimeters (cm)</span>
                      </label>
                    </div>

                    {/* Desktop: Select dropdown */}
                    <select
                      key={`lengthUnit-${settings.lengthUnit || 'cm'}`}
                      id="lengthUnit"
                      value={settings.lengthUnit || 'cm'}
                      onChange={(e) => {
                        e.preventDefault();
                        updateSetting('lengthUnit', e.target.value);
                      }}
                      className="hidden sm:block mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="in">Inches (in)</option>
                      <option value="cm">Centimeters (cm)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Date & Time</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>

                    {/* Mobile: Radio buttons */}
                    <div className="flex gap-3 sm:hidden">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="dateFormat"
                          value="MM/DD/YYYY"
                          checked={(settings.dateFormat || 'MM/DD/YYYY') === 'MM/DD/YYYY'}
                          onChange={(e) => updateSetting('dateFormat', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">MM/DD/YYYY</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="dateFormat"
                          value="DD/MM/YYYY"
                          checked={(settings.dateFormat || 'MM/DD/YYYY') === 'DD/MM/YYYY'}
                          onChange={(e) => updateSetting('dateFormat', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">DD/MM/YYYY</span>
                      </label>
                    </div>

                    {/* Desktop: Select dropdown */}
                    <select
                      key={`dateFormat-${settings.dateFormat || 'MM/DD/YYYY'}`}
                      id="dateFormat"
                      value={settings.dateFormat || 'MM/DD/YYYY'}
                      onChange={(e) => {
                        e.preventDefault();
                        updateSetting('dateFormat', e.target.value);
                      }}
                      className="hidden sm:block mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700 mb-1">
                      Time Format
                    </label>

                    {/* Mobile: Radio buttons */}
                    <div className="flex gap-3 sm:hidden">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="timeFormat"
                          value="12h"
                          checked={(settings.timeFormat || '12h') === '12h'}
                          onChange={(e) => updateSetting('timeFormat', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">12h (AM/PM)</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="timeFormat"
                          value="24h"
                          checked={(settings.timeFormat || '12h') === '24h'}
                          onChange={(e) => updateSetting('timeFormat', e.target.value)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs">24h</span>
                      </label>
                    </div>

                    {/* Desktop: Select dropdown */}
                    <select
                      key={`timeFormat-${settings.timeFormat || '12h'}`}
                      id="timeFormat"
                      value={settings.timeFormat || '12h'}
                      onChange={(e) => {
                        e.preventDefault();
                        updateSetting('timeFormat', e.target.value);
                      }}
                      className="hidden sm:block mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="12h">12-hour (AM/PM)</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Assistant */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3">AI Assistant</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="aiService" className="block text-sm font-medium text-gray-700 mb-1">
                      AI Service
                    </label>
                    <select
                      key={`aiService-${settings.aiService || 'chatgpt'}`}
                      id="aiService"
                      value={settings.aiService || 'chatgpt'}
                      onChange={(e) => {
                        e.preventDefault();
                        updateSetting('aiService', e.target.value);
                      }}
                      className="mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="chatgpt">ChatGPT</option>
                      <option value="claude">Claude AI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="grok">Grok (X)</option>
                      <option value="custom">Custom URL</option>
                    </select>
                    {settings.aiService === 'custom' && (
                      <div className="mt-2">
                        <label htmlFor="aiCustomUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Custom AI Service URL
                        </label>
                        <input
                          type="url"
                          id="aiCustomUrl"
                          value={settings.aiCustomUrl || ''}
                          onChange={(e) => updateSetting('aiCustomUrl', e.target.value)}
                          placeholder="https://your-ai-service.com/?q="
                          className="w-full px-3 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="aiRequestFormat" className="block text-sm font-medium text-gray-700 mb-1">
                      Request Format
                    </label>
                    <select
                      key={`aiRequestFormat-${settings.aiRequestFormat || 'detailed'}`}
                      id="aiRequestFormat"
                      value={settings.aiRequestFormat || 'detailed'}
                      onChange={(e) => {
                        e.preventDefault();
                        updateSetting('aiRequestFormat', e.target.value);
                      }}
                      className="mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="detailed">Detailed (Full prompt)</option>
                      <option value="simple">Simple (Basic request)</option>
                      <option value="custom">Custom Template</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="aiLanguage" className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      key={`aiLanguage-${settings.aiLanguage || 'english'}`}
                      id="aiLanguage"
                      value={settings.aiLanguage || 'english'}
                      onChange={(e) => {
                        e.preventDefault();
                        updateSetting('aiLanguage', e.target.value);
                      }}
                      className="mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="english">English</option>
                      <option value="spanish">Spanish</option>
                      <option value="french">French</option>
                      <option value="german">German</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <input
                        type="checkbox"
                        checked={settings.aiIncludeCurrentValues !== false}
                        onChange={(e) => updateSetting('aiIncludeCurrentValues', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Include Current Values
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Include existing nutritional values in AI prompt</p>
                  </div>
                </div>
                {settings.aiRequestFormat === 'custom' && (
                  <div className="mt-4">
                    <label htmlFor="aiPromptTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Prompt Template
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Use placeholders: {'{mealName}'}, {'{amount}'}, {'{calories}'}, {'{protein}'}, {'{carbs}'}, {'{fats}'}, {'{fibre}'}, {'{other}'}
                    </p>
                    <textarea
                      id="aiPromptTemplate"
                      value={settings.aiPromptTemplate || ''}
                      onChange={(e) => updateSetting('aiPromptTemplate', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="Enter your custom prompt template..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
