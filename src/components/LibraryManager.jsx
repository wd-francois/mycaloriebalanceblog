import React, { useState, useEffect } from 'react';
import healthDB from '../lib/database.js';
import { useSettings, SettingsProvider } from '../contexts/SettingsContext.jsx';

const LibraryManager = () => {
  const [activeTab, setActiveTab] = useState('meals');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    notes: '',
    description: '',
    category: '',
    defaultSets: '',
    defaultReps: '',
    muscleGroups: '',
    difficulty: ''
  });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // Safely get settings with fallback
  let generateAIPrompt, getAIServiceUrl;
  try {
    const settings = useSettings();
    generateAIPrompt = settings.generateAIPrompt;
    getAIServiceUrl = settings.getAIServiceUrl;
  } catch (error) {
    console.warn('Settings context not available, using fallback AI functions');
    // Fallback functions
    generateAIPrompt = (mealData) => {
      const { name, amount, calories, protein, carbs, fats } = mealData;
      return `I have a meal entry for "${name || 'Unknown Meal'}" with amount: ${amount || 'not specified'}. 

Current nutritional values:
- Calories: ${calories || 'not specified'}
- Protein: ${protein || 'not specified'}g
- Carbs: ${carbs || 'not specified'}g
- Fats: ${fats || 'not specified'}g

Please provide accurate nutritional information for this meal. Include:
1. Calories per serving
2. Protein content in grams
3. Carbohydrates content in grams
4. Fats content in grams
5. Any additional nutritional insights

Please format your response clearly so I can easily update my meal entry.`;
    };
    getAIServiceUrl = (prompt) => {
      const encodedPrompt = encodeURIComponent(prompt);
      return `https://chat.openai.com/?q=${encodedPrompt}`;
    };
  }

  // Load data on component mount
  useEffect(() => {
    setIsClient(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    try {
      // Try IndexedDB first, fallback to localStorage
      try {
        // Initialize database if not already done
        if (!healthDB.db) {
          await healthDB.init();
          await healthDB.initializeSampleData();
        }

        // Load data from IndexedDB
        const mealData = await healthDB.getFoodItems('', 100);
        
        // Set state directly
        setMeals([...mealData]);
        
        console.log('Loaded from IndexedDB:', mealData.length, 'meals');
        setLoading(false);
        return; // Exit early on success
      } catch (indexedDBError) {
        console.warn('IndexedDB failed, falling back to localStorage:', indexedDBError);
        // Call the localStorage function directly
        const mealData = [];
        
        try {
          const mealDataStr = localStorage.getItem('mealLibrary');
          if (mealDataStr) {
            const parsed = JSON.parse(mealDataStr);
            if (Array.isArray(parsed)) {
              mealData.push(...parsed);
            }
          }
        } catch (error) {
          console.error('Error loading meals from localStorage:', error);
        }
        
        // Add sample data if library is empty
        
        if (mealData.length === 0) {
          const sampleMeals = [
            {
              id: 1,
              name: 'Breakfast',
              amount: '1 serving',
              calories: 400,
              protein: 20,
              carbs: 45,
              fats: 15,
              category: 'Meal',
              description: 'Morning meal'
            },
            {
              id: 2,
              name: 'Lunch',
              amount: '1 plate',
              calories: 600,
              protein: 35,
              carbs: 60,
              fats: 20,
              category: 'Meal',
              description: 'Midday meal'
            },
            {
              id: 3,
              name: 'Dinner',
              amount: '1 portion',
              calories: 700,
              protein: 40,
              carbs: 55,
              fats: 25,
              category: 'Meal',
              description: 'Evening meal'
            }
          ];
          mealData.push(...sampleMeals);
          localStorage.setItem('mealLibrary', JSON.stringify(sampleMeals));
        }
        
        setMeals([...mealData]);
        
        console.log('Loaded from localStorage:', mealData.length, 'meals');
        setLoading(false);
        return; // Exit early on success
      }
      
    } catch (error) {
      console.error('Error loading library data:', error);
      // Final fallback - set empty arrays
      setMeals([]);
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      amount: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      description: '',
      category: '',
      defaultSets: '',
      defaultReps: '',
      muscleGroups: '',
      difficulty: ''
    });
    setShowAddModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      amount: item.amount || '',
      calories: item.calories || '',
      protein: item.protein || '',
      carbs: item.carbs || '',
      fats: item.fats || '',
      notes: item.notes || '',
      description: item.description || '',
      category: item.category || '',
      defaultSets: item.defaultSets || '',
      defaultReps: item.defaultReps || '',
      muscleGroups: item.muscleGroups || '',
      difficulty: item.difficulty || ''
    });
    setShowAddModal(true);
  };

  const handleSaveItem = async () => {
    try {
      if (!formData.name.trim()) {
        alert('Please enter a name for the item.');
        return;
      }

      const itemData = {
        name: formData.name.trim(),
        amount: formData.amount.trim(),
        calories: formData.calories ? parseInt(formData.calories) : null,
        protein: formData.protein ? parseInt(formData.protein) : null,
        carbs: formData.carbs ? parseInt(formData.carbs) : null,
        fats: formData.fats ? parseInt(formData.fats) : null,
        notes: formData.notes || ''
      };

      // Try IndexedDB first, fallback to localStorage
      try {
        if (editingItem) {
          // Update existing item
          await healthDB.updateItem('food', editingItem.id, itemData);
        } else {
          // Add new item
          await healthDB.addItem('food', itemData);
        }
      } catch (indexedDBError) {
        console.warn('IndexedDB save failed, using localStorage:', indexedDBError);
        // Fallback to localStorage
        const storageKey = 'mealLibrary';
        const currentItems = JSON.parse(localStorage.getItem(storageKey) || '[]');

        if (editingItem) {
          // Update existing item
          const updatedItems = currentItems.map(item => 
            item.id === editingItem.id ? { ...item, ...itemData } : item
          );
          localStorage.setItem(storageKey, JSON.stringify(updatedItems));
        } else {
          // Add new item
          const newItem = { id: Date.now(), ...itemData };
          currentItems.push(newItem);
          localStorage.setItem(storageKey, JSON.stringify(currentItems));
        }
      }

      setShowAddModal(false);
      
      // Show success message
      alert(`${activeTab === 'exercises' ? 'Exercise' : 'Meal'} ${editingItem ? 'updated' : 'added'} successfully!`);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        // Try IndexedDB first, fallback to localStorage
        try {
          await healthDB.deleteItem(activeTab === 'exercises' ? 'exercise' : 'food', item.id);
        } catch (indexedDBError) {
          console.warn('IndexedDB delete failed, using localStorage:', indexedDBError);
          // Fallback to localStorage
          const storageKey = activeTab === 'exercises' ? 'exerciseLibrary' : 'mealLibrary';
          const currentItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const updatedItems = currentItems.filter(existingItem => existingItem.id !== item.id);
          localStorage.setItem(storageKey, JSON.stringify(updatedItems));
        }
        
        await loadData(); // Reload data
        alert(`${activeTab === 'exercises' ? 'Exercise' : 'Meal'} deleted successfully!`);
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
      }
    }
  };

  const handleItemInfo = (item) => {
    setSelectedItem(item);
    setShowInfoModal(true);
  };

  const handleAIClick = (item) => {
    // Generate prompt using settings context
    const prompt = generateAIPrompt({
      name: item.name,
      amount: item.amount,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats
    });

    // Get the appropriate AI service URL
    const aiUrl = getAIServiceUrl(prompt);
    
    // Open AI service with the prompt
    window.open(aiUrl, '_blank');
  };

  const currentItems = meals;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading library...</span>
      </div>
    );
  }

  // Don't render on server side
  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('meals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'meals'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🍽️</span>
                Meals ({meals.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Add Buttons */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Meal Library
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleAddItem}
            className="px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add to Library
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border ${
              activeTab === 'exercises'
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">{item.name}</h3>
                {activeTab === 'meals' && item.amount && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{item.amount}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleItemInfo(item)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
                  title={`${activeTab === 'exercises' ? 'Exercise' : 'Meal'} Information`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {activeTab === 'meals' && (
                  <button
                    onClick={() => handleAIClick(item)}
                    className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded"
                    title="Get AI nutrition info"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleEditItem(item)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={`Edit ${activeTab === 'exercises' ? 'Exercise' : 'Meal'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No meals found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by adding your first meal.
          </p>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 bg-blue-600 hover:bg-blue-700"
          >
            Add Meal
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl mx-4 z-10">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Edit' : 'Add'} Meal
              </h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meal Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Breakfast, Lunch, Dinner, Snack"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 1 cup, 500 grams, 2 slices"
                />
              </div>
              
              {/* Nutrition Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., 250"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., 20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fats (g)
                  </label>
                  <input
                    type="number"
                    value={formData.fats}
                    onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., 10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Add any notes about this meal..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!formData.name}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === 'exercises'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editingItem ? 'Update' : 'Add'} {activeTab === 'exercises' ? 'Exercise' : 'Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Info Modal */}
      {showInfoModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Meal Information: {selectedItem.name}
                </h3>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {selectedItem.amount && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Amount
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedItem.amount}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        {selectedItem.calories && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Calories
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedItem.calories} cal</p>
                          </div>
                        )}
                        
                        {selectedItem.protein && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Protein
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedItem.protein}g</p>
                          </div>
                        )}
                        
                        {selectedItem.carbs && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Carbs
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedItem.carbs}g</p>
                          </div>
                        )}
                        
                        {selectedItem.fats && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fats
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedItem.fats}g</p>
                          </div>
                        )}
                      </div>
                      
                      {selectedItem.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                          </label>
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedItem.notes}</p>
                        </div>
                      )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowInfoModal(false);
                    handleEditItem(selectedItem);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit {activeTab === 'exercises' ? 'Exercise' : 'Meal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component with SettingsProvider
const LibraryManagerWithProvider = () => {
  return (
    <SettingsProvider>
      <LibraryManager />
    </SettingsProvider>
  );
};

export default LibraryManagerWithProvider;
