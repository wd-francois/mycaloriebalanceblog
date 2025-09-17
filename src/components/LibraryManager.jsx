import React, { useState, useEffect } from 'react';
import healthDB from '../lib/database.js';

const LibraryManager = ({ isOpen, onClose, type = 'food' }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Manage {type === 'food' ? 'Food' : 'Exercise'} Library
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Items List */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            {/* Search and Add Button */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder={`Search ${type === 'food' ? 'food' : 'exercises'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add New
                </button>
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
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEdit(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.category && (
                            <div className="text-sm text-gray-500">{item.category}</div>
                          )}
                          {item.description && (
                            <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                          )}
                          {type === 'exercise' && (item.defaultSets || item.defaultReps) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.defaultSets && `${item.defaultSets} sets`}
                              {item.defaultSets && item.defaultReps && ' • '}
                              {item.defaultReps && `${item.defaultReps} reps`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="w-1/2 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${type === 'food' ? 'food' : 'exercise'} name`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Protein, Cardio, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {type === 'exercise' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Sets
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultSets}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultSets: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Reps
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.defaultReps}
                      onChange={(e) => setFormData(prev => ({ ...prev, defaultReps: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
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
