import React, { useState, useEffect, useRef } from 'react';
import healthDB from '../lib/database.js';

const AutocompleteInput = ({ 
  type = 'food', // 'food' or 'exercise'
  value, 
  onChange, 
  placeholder = 'Type to search...',
  onSelect,
  className = '',
  autoFocus = false
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search function
  const searchItems = async (term) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (term.length < 1) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const items = type === 'food' 
          ? await healthDB.getFoodItems(term, 10)
          : await healthDB.getExerciseItems(term, 10);
        
        setSuggestions(items);
        setIsOpen(items.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching items:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onChange(value);
    searchItems(value);
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    setSearchTerm(item.name);
    onChange(item.name);
    setIsOpen(false);
    setSuggestions([]);
    if (onSelect) {
      onSelect(item);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleItemSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${className}`}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, index) => (
            <div
              key={item.id}
              onClick={() => handleItemSelect(item)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.category && (
                    <div className="text-sm text-gray-500">{item.category}</div>
                  )}
                  {item.description && (
                    <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                  )}
                </div>
                {type === 'exercise' && (item.defaultSets || item.defaultReps) && (
                  <div className="text-xs text-gray-500 ml-2">
                    {item.defaultSets && `${item.defaultSets} sets`}
                    {item.defaultSets && item.defaultReps && ' • '}
                    {item.defaultReps && `${item.defaultReps} reps`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;

