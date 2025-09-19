import React, { useState, useEffect } from 'react';
import healthDB from '../lib/database.js';

const LibraryManager = ({ isOpen, onClose, type = 'food', frequentItems = [], onUpdateFrequentItems }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    defaultSets: '',
    defaultReps: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAddSection, setShowQuickAddSection] = useState(false);

  // Load items when component mounts or type changes
  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, type]);

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = type === 'food' 
        ? await healthDB.getFoodItems('', 100)
        : await healthDB.getExerciseItems('', 100);
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      defaultSets: '',
      defaultReps: ''
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || '',
      description: item.description || '',
      defaultSets: item.defaultSets || '',
      defaultReps: item.defaultReps || ''
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      const itemData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        ...(type === 'exercise' && {
          defaultSets: formData.defaultSets ? parseInt(formData.defaultSets) : null,
          defaultReps: formData.defaultReps ? parseInt(formData.defaultReps) : null
        })
      };

      console.log('Saving item:', { editingItem, itemData, type });

      if (editingItem) {
        console.log('Updating item with ID:', editingItem.id);
        await healthDB.updateItem(type, editingItem.id, itemData);
        console.log('Item updated successfully');
      } else {
        console.log('Adding new item');
        await healthDB.addItem(type, itemData);
        console.log('Item added successfully');
      }

      await loadItems();
      setEditingItem(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        defaultSets: '',
        defaultReps: ''
      });
    } catch (error) {
      console.error('Error saving item:', error);
      alert(`Error saving item: ${error.message}. Please try again.`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await healthDB.deleteItem(type, id);
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      defaultSets: '',
      defaultReps: ''
    });
  };

  // Quick Add Management Functions
  const toggleQuickAddItem = (item) => {
    if (!onUpdateFrequentItems) return;
    
    const isCurrentlyFrequent = frequentItems.some(frequentItem => frequentItem.id === item.id);
    
    if (isCurrentlyFrequent) {
      // Remove from frequent items
      const updatedFrequentItems = frequentItems.filter(frequentItem => frequentItem.id !== item.id);
      onUpdateFrequentItems(updatedFrequentItems);
    } else {
      // Add to frequent items (limit to 5 items)
      if (frequentItems.length < 5) {
        const updatedFrequentItems = [...frequentItems, item];
        onUpdateFrequentItems(updatedFrequentItems);
      } else {
        alert(`You can only have up to 5 quick add items. Please remove one first.`);
      }
    }
  };

  const isQuickAddItem = (item) => {
    return frequentItems.some(frequentItem => frequentItem.id === item.id);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              Manage {type === 'food' ? 'Food' : 'Exercise'} Library
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(95vh-80px)] sm:h-[calc(90vh-80px)]">
          {/* Left Panel - Items List */}
          <div className="w-full lg:w-1/2 border-r-0 lg:border-r border-gray-200 flex flex-col">
            {/* Search and Add Button */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="text"
                  placeholder={`Search ${type === 'food' ? 'food' : 'exercises'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] whitespace-nowrap"
                >
                  Add New
                </button>
              </div>
            </div>

            {/* Quick Add Status */}
            <div className="px-3 sm:px-6 py-2 sm:py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-blue-800">Quick Add Items:</span>
                  <span className="text-xs sm:text-sm text-blue-600">{frequentItems.length}/5 selected</span>
                </div>
                <div className="text-xs text-blue-600">
                  Click "+ Quick" to add items to quick add buttons
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEdit(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            {item.name}
                          </div>
                          {item.category && (
                            <div className="text-xs sm:text-sm text-gray-500 truncate">{item.category}</div>
                          )}
                          {item.description && (
                            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</div>
                          )}
                          {type === 'exercise' && (item.defaultSets || item.defaultReps) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.defaultSets && `${item.defaultSets} sets`}
                              {item.defaultSets && item.defaultReps && ' • '}
                              {item.defaultReps && `${item.defaultReps} reps`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {/* Quick Add Toggle Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleQuickAddItem(item);
                            }}
                            className={`px-1.5 sm:px-2 py-1 text-xs rounded-full transition-colors min-h-[32px] ${
                              isQuickAddItem(item)
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={isQuickAddItem(item) ? 'Remove from Quick Add' : 'Add to Quick Add'}
                          >
                            <span className="hidden sm:inline">{isQuickAddItem(item) ? '✓ Quick' : '+ Quick'}</span>
                            <span className="sm:hidden">{isQuickAddItem(item) ? '✓' : '+'}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Edit Form */}
          <div className="w-full lg:w-1/2 p-3 sm:p-6 border-t lg:border-t-0 border-gray-200 lg:border-t-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>

            <form className="space-y-3 sm:space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder={`Enter ${type === 'food' ? 'food' : 'exercise'} name`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="e.g., Protein, Cardio, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {type === 'exercise' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Default Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultSets}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultSets: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Default Reps
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultReps}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultReps: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      placeholder="10"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] flex-1 sm:flex-none"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px] flex-1 sm:flex-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LibraryManager;
