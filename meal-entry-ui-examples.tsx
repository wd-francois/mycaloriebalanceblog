import React, { useState } from 'react';
import { Camera, Upload, Utensils, Moon, Ruler, Clock, X } from 'lucide-react';

export default function MealEntryExamples() {
  const [activeTab, setActiveTab] = useState('time');
  const [selectedTime, setSelectedTime] = useState('now');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [customTime, setCustomTime] = useState('11:57');

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">UI Improvement Examples</h1>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('time')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'time'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            1. Time Picker
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'hierarchy'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            2. Visual Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'photo'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            3. Photo Options
          </button>
        </div>

        {/* Example 1: Time Picker */}
        {activeTab === 'time' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-800 mb-2">❌ Before (4 Dropdowns)</h3>
                <p className="text-sm text-red-700">Cumbersome and slow to use</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Add New Meal Entry</h3>
                <div className="flex gap-2 mb-4">
                  <select className="border border-gray-300 rounded px-3 py-2 text-sm flex-1">
                    <option>11</option>
                  </select>
                  <select className="border border-gray-300 rounded px-3 py-2 text-sm flex-1">
                    <option>57</option>
                  </select>
                  <select className="border border-gray-300 rounded px-3 py-2 text-sm flex-1">
                    <option>AM</option>
                  </select>
                  <input
                    type="text"
                    value="11:57 AM"
                    disabled
                    className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* After */}
            <div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ After (Quick Presets)</h3>
                <p className="text-sm text-green-700">Fast and intuitive</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Add New Meal Entry</h3>
                
                {/* Quick time buttons */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-1" />
                    When did you eat?
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => setSelectedTime('now')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedTime === 'now'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Now
                    </button>
                    <button
                      onClick={() => setSelectedTime('30min')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedTime === '30min'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      30m ago
                    </button>
                    <button
                      onClick={() => setSelectedTime('1hour')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedTime === '1hour'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      1h ago
                    </button>
                  </div>
                  
                  {/* Custom time picker */}
                  <button
                    onClick={() => setSelectedTime('custom')}
                    className="w-full text-left px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    📅 Or pick a custom time...
                  </button>
                  
                  {selectedTime === 'custom' && (
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
                
                <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded">
                  ⏰ {selectedTime === 'now' ? 'Right now' : selectedTime === '30min' ? '30 minutes ago' : selectedTime === '1hour' ? '1 hour ago' : customTime}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Example 2: Visual Hierarchy */}
        {activeTab === 'hierarchy' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-800 mb-2">❌ Before (Plain Buttons)</h3>
                <p className="text-sm text-red-700">No visual distinction or hierarchy</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg mb-3">
                  Add Meal
                </button>
                <button className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg mb-3">
                  Add Sleep
                </button>
                <button className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg">
                  Add Measurements
                </button>
              </div>
            </div>

            {/* After */}
            <div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ After (Icons & Colors)</h3>
                <p className="text-sm text-green-700">Clear purpose with visual cues</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4">What would you like to log?</h3>
                
                {/* Primary action - Meal */}
                <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-4 rounded-xl mb-3 flex items-center justify-between transition-all shadow-md hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-lg">Add Meal</div>
                      <div className="text-sm text-green-100">Log what you ate</div>
                    </div>
                  </div>
                  <span className="text-2xl">→</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  {/* Sleep */}
                  <button className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 text-purple-700 px-4 py-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                    <div className="bg-purple-200 p-2 rounded-lg">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div className="font-medium text-sm">Sleep</div>
                  </button>

                  {/* Measurements */}
                  <button className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 text-blue-700 px-4 py-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                    <div className="bg-blue-200 p-2 rounded-lg">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <div className="font-medium text-sm">Measure</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Example 3: Photo Options */}
        {activeTab === 'photo' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-800 mb-2">❌ Before (Two Buttons)</h3>
                <p className="text-sm text-red-700">Confusing and takes up space</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-2">Attach Photo (optional)</h4>
                <p className="text-sm text-gray-600 mb-4">Capture what you're logging or choose a saved picture.</p>
                
                <button className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg mb-2 flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  Take Photo
                </button>
                <button className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Photo
                </button>
              </div>
            </div>

            {/* After */}
            <div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ After (Single Button + Modal)</h3>
                <p className="text-sm text-green-700">Cleaner with modal for options</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600 px-6 py-8 rounded-xl transition-all flex flex-col items-center gap-2"
                >
                  <div className="bg-gray-100 p-3 rounded-full">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="font-medium">Add Photo (optional)</div>
                  <div className="text-sm text-gray-500">Tap to take or upload</div>
                </button>

                {/* Modal */}
                {showPhotoModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-[scaleIn_0.2s_ease-out]">
                      <button
                        onClick={() => setShowPhotoModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Add Photo</h3>
                      
                      <div className="space-y-3">
                        <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl flex items-center gap-4 transition-all shadow-md hover:shadow-lg">
                          <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                            <Camera className="w-6 h-6" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-semibold">Take Photo</div>
                            <div className="text-sm text-blue-100">Use your camera</div>
                          </div>
                        </button>

                        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-xl flex items-center gap-4 transition-all">
                          <div className="bg-gray-200 p-2 rounded-lg">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-semibold">Upload Photo</div>
                            <div className="text-sm text-gray-500">Choose from gallery</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💡 Key Improvements</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="font-semibold text-gray-800 mb-2">Faster Input</h4>
              <p className="text-sm text-gray-600">Quick time presets reduce 4 clicks to 1 click</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🎨</div>
              <h4 className="font-semibold text-gray-800 mb-2">Clear Visual Cues</h4>
              <p className="text-sm text-gray-600">Icons and colors help users understand options instantly</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🧹</div>
              <h4 className="font-semibold text-gray-800 mb-2">Cleaner Interface</h4>
              <p className="text-sm text-gray-600">Modal reduces clutter while keeping functionality</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}