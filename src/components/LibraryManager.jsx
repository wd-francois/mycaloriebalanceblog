import React, { useState, useEffect } from 'react';
import healthDB from '../lib/database.js';

const LibraryManager = () => {
  const [activeTab, setActiveTab] = useState('exercises');
  const [exercises, setExercises] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
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
  // Quick add related state variables removed - no longer needed

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    setLoading(true);
    try {
      // Try IndexedDB first, fallback to localStorage
      try {
        // Initialize database if not already done
        if (!healthDB.db) {
          await healthDB.init();
          await healthDB.initializeSampleData();
        }

        // Load data from IndexedDB
        const exerciseData = await healthDB.getExerciseItems('', 100);
        const mealData = await healthDB.getFoodItems('', 100);
        
        // Set state directly
        setExercises([...exerciseData]);
        setMeals([...mealData]);
        
        console.log('Loaded from IndexedDB:', exerciseData.length, 'exercises,', mealData.length, 'meals');
        setLoading(false);
        return; // Exit early on success
      } catch (indexedDBError) {
        console.warn('IndexedDB failed, falling back to localStorage:', indexedDBError);
        // Call the localStorage function directly
        const exerciseData = [];
        const mealData = [];
        
        try {
          const exerciseDataStr = localStorage.getItem('exerciseLibrary');
          if (exerciseDataStr) {
            const parsed = JSON.parse(exerciseDataStr);
            if (Array.isArray(parsed)) {
              exerciseData.push(...parsed);
            }
          }
        } catch (error) {
          console.error('Error loading exercises from localStorage:', error);
        }
        
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
        
        // Add sample data if libraries are empty
        if (exerciseData.length === 0) {
          const sampleExercises = [
            {
              id: 1,
              name: 'Push-ups',
              description: 'Upper body exercise',
              category: 'Bodyweight',
              defaultSets: 3,
              defaultReps: 10,
              muscleGroups: 'Chest, Triceps, Shoulders',
              difficulty: 'Beginner'
            },
            {
              id: 2,
              name: 'Squats',
              description: 'Lower body exercise',
              category: 'Bodyweight',
              defaultSets: 3,
              defaultReps: 15,
              muscleGroups: 'Quadriceps, Glutes, Hamstrings',
              difficulty: 'Beginner'
            },
            {
              id: 3,
              name: 'Bench Press',
              description: 'Chest exercise with weights',
              category: 'Weight Training',
              defaultSets: 3,
              defaultReps: 8,
              muscleGroups: 'Chest, Triceps, Shoulders',
              difficulty: 'Intermediate'
            }
          ];
          exerciseData.push(...sampleExercises);
          localStorage.setItem('exerciseLibrary', JSON.stringify(sampleExercises));
        }
        
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
        
        setExercises([...exerciseData]);
        setMeals([...mealData]);
        
        console.log('Loaded from localStorage:', exerciseData.length, 'exercises,', mealData.length, 'meals');
        setLoading(false);
        return; // Exit early on success
      }
      
      // Frequent items loading removed - no longer needed
      
    } catch (error) {
      console.error('Error loading library data:', error);
      // Final fallback - set empty arrays
      setExercises([]);
      setMeals([]);
      setLoading(false);
    }
  };

  const loadDataFromLocalStorage = () => {
    try {
      // Load from localStorage with error handling
      let exerciseData = [];
      let mealData = [];
      
      try {
        const exerciseDataStr = localStorage.getItem('exerciseLibrary');
        if (exerciseDataStr) {
          exerciseData = JSON.parse(exerciseDataStr);
          if (!Array.isArray(exerciseData)) {
            exerciseData = [];
          }
        }
      } catch (error) {
        exerciseData = [];
      }
      
      try {
        const mealDataStr = localStorage.getItem('mealLibrary');
        if (mealDataStr) {
          mealData = JSON.parse(mealDataStr);
          if (!Array.isArray(mealData)) {
            mealData = [];
          }
        }
      } catch (error) {
        mealData = [];
      }
      
      // Add sample data if libraries are empty
      if (exerciseData.length === 0) {
        exerciseData = [
          {
            id: 1,
            name: 'Push-ups',
            description: 'Upper body exercise',
            category: 'Bodyweight',
            defaultSets: 3,
            defaultReps: 10,
            muscleGroups: 'Chest, Triceps, Shoulders',
            difficulty: 'Beginner'
          },
          {
            id: 2,
            name: 'Squats',
            description: 'Lower body exercise',
            category: 'Bodyweight',
            defaultSets: 3,
            defaultReps: 15,
            muscleGroups: 'Quadriceps, Glutes, Hamstrings',
            difficulty: 'Beginner'
          },
          {
            id: 3,
            name: 'Bench Press',
            description: 'Chest exercise with weights',
            category: 'Weight Training',
            defaultSets: 3,
            defaultReps: 8,
            muscleGroups: 'Chest, Triceps, Shoulders',
            difficulty: 'Intermediate'
          }
        ];
        localStorage.setItem('exerciseLibrary', JSON.stringify(exerciseData));
      }
      
      if (mealData.length === 0) {
        mealData = [
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
        localStorage.setItem('mealLibrary', JSON.stringify(mealData));
      }
      
      // Set state directly
      setExercises([...exerciseData]);
      setMeals([...mealData]);
      
      console.log('Loaded from localStorage:', exerciseData.length, 'exercises,', mealData.length, 'meals');
    } catch (error) {
      console.error('Error loading from localStorage:', error);
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
        ...(activeTab === 'exercises' ? {
          category: formData.category || 'General',
          notes: formData.notes || ''
        } : {
          amount: formData.amount.trim(),
          calories: formData.calories ? parseInt(formData.calories) : null,
          protein: formData.protein ? parseInt(formData.protein) : null,
          carbs: formData.carbs ? parseInt(formData.carbs) : null,
          fats: formData.fats ? parseInt(formData.fats) : null,
          notes: formData.notes || ''
        })
      };

      // Try IndexedDB first, fallback to localStorage
      try {
        if (editingItem) {
          // Update existing item
          await healthDB.updateItem(activeTab === 'exercises' ? 'exercise' : 'food', editingItem.id, itemData);
        } else {
          // Add new item
          await healthDB.addItem(activeTab === 'exercises' ? 'exercise' : 'food', itemData);
        }
      } catch (indexedDBError) {
        console.warn('IndexedDB save failed, using localStorage:', indexedDBError);
        // Fallback to localStorage
        const storageKey = activeTab === 'exercises' ? 'exerciseLibrary' : 'mealLibrary';
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

  // Quick add save function removed - no longer needed

  // Quick add manager function removed - no longer needed

  // Quick add functionality removed - no longer needed

  // Toggle quick add function removed - no longer needed

  const currentItems = activeTab === 'exercises' ? exercises : meals;
  

  // Debug: Always show something
  console.log('LibraryManager rendering, loading:', loading, 'exercises:', exercises.length, 'meals:', meals.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading library...</span>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('exercises')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'exercises'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Exercises ({exercises.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'meals'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Meals ({meals.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Add Buttons */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {activeTab === 'exercises' ? 'Exercise' : 'Meal'} Library
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleAddItem}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'exercises'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No {activeTab} found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by adding your first {activeTab === 'exercises' ? 'exercise' : 'meal'}.
          </p>
          <button
            onClick={handleAddItem}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 ${
              activeTab === 'exercises'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Add {activeTab === 'exercises' ? 'Exercise' : 'Meal'}
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
                {editingItem ? 'Edit' : 'Add'} {activeTab === 'exercises' ? 'Exercise' : 'Meal'}
              </h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {activeTab === 'exercises' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exercise Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter exercise name"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select category</option>
                      <option value="Bodyweight">Bodyweight</option>
                      <option value="Weight Training">Weight Training</option>
                      <option value="Cardio">Cardio</option>
                      <option value="Core">Core</option>
                      <option value="Flexibility">Flexibility</option>
                      <option value="Functional">Functional</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Add any notes about this exercise..."
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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

      {/* Quick Add Modal removed - no longer needed */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickAddModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Add {activeTab === 'exercises' ? 'Exercise' : 'Meal'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Adding "{selectedItem.name}" to today's entries
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={quickAddData.time}
                  onChange={(e) => setQuickAddData({ ...quickAddData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {activeTab === 'exercises' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sets
                      </label>
                      <input
                        type="number"
                        value={quickAddData.sets}
                        onChange={(e) => setQuickAddData({ ...quickAddData, sets: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Sets"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reps
                      </label>
                      <input
                        type="number"
                        value={quickAddData.reps}
                        onChange={(e) => setQuickAddData({ ...quickAddData, reps: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Reps"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={quickAddData.weight}
                        onChange={(e) => setQuickAddData({ ...quickAddData, weight: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Weight"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        value={quickAddData.duration}
                        onChange={(e) => setQuickAddData({ ...quickAddData, duration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Duration"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={selectedItem.calories || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    placeholder="No calories set"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={quickAddData.notes}
                  onChange={(e) => setQuickAddData({ ...quickAddData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows="3"
                  placeholder="Add any notes..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAddSave}
                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200 ${
                  activeTab === 'exercises'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Add to Today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Manager Modal removed - no longer needed */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickAddManager(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Manage Quick Add Exercise
                </h3>
                <button
                  onClick={() => setShowQuickAddManager(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Select up to 5 exercises to appear in quick add buttons. Currently selected: {frequentItems.exercise.length}/5
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {exercises.map((item) => {
                  const isSelected = frequentItems.exercise.some(frequentItem => frequentItem.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' 
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleQuickAddItem(item, 'exercise')}
                        className={`ml-3 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowQuickAddManager(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Done
                </button>
              </div>
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
                  {activeTab === 'exercises' ? 'Exercise' : 'Meal'} Information: {selectedItem.name}
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
                  {activeTab === 'exercises' ? (
                    <>
                      {selectedItem.category && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedItem.category}</p>
                        </div>
                      )}
                      
                      {selectedItem.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                          </label>
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedItem.notes}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
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

export default LibraryManager;
