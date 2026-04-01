import { useState, useEffect, useRef, useCallback } from 'react';
import healthDB from '../lib/database.js';

const AutocompleteInput = ({
  type = 'food', // 'food' or 'exercise'
  value,
  onChange,
  placeholder = 'Type to search...',
  onSelect,
  className = '',
  autoFocus = false,
  id = null,
  /** When true, focusing an empty field loads recent library items (same as typing). */
  suggestOnEmptyFocus = true,
  emptyFocusLimit = 10,
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchMatching = useCallback(
    async (term) => {
      setIsLoading(true);
      try {
        if (!healthDB.db) await healthDB.init();
        const items =
          type === 'food'
            ? await healthDB.getFoodItems(term, 12)
            : await healthDB.getExerciseItems(term, 12);
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
    },
    [type]
  );

  const fetchRecent = useCallback(async () => {
    if (!suggestOnEmptyFocus) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!healthDB.db) await healthDB.init();
      const items =
        type === 'food'
          ? await healthDB.getFoodItems('', emptyFocusLimit)
          : await healthDB.getExerciseItems('', emptyFocusLimit);
      setSuggestions(items);
      setIsOpen(items.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error loading recent items:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [type, suggestOnEmptyFocus, emptyFocusLimit]);

  const searchItems = useCallback(
    (term) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (term.length < 1) {
        debounceRef.current = setTimeout(() => {
          fetchRecent();
        }, 0);
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchMatching(term);
      }, 300);
    },
    [fetchMatching, fetchRecent]
  );

  const handleInputChange = (e) => {
    const v = e.target.value;
    setSearchTerm(v);
    onChange(v);
    searchItems(v);
  };

  const handleItemSelect = (item) => {
    setSearchTerm(item.name);
    onChange(item.name);
    setIsOpen(false);
    setSuggestions([]);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        if (isOpen && suggestions.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        }
        break;
      case 'ArrowUp':
        if (isOpen && suggestions.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleItemSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        if (isOpen) {
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSearchTerm(value || '');
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if ((searchTerm || '').length < 1 && suggestOnEmptyFocus) {
            fetchRecent();
          } else if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${className}`}
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400" />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-[var(--color-bg-muted)] border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, index) => (
            <div
              key={item.id != null ? String(item.id) : `${item.name}-${index}`}
              role="option"
              tabIndex={-1}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => handleItemSelect(item)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{item.name}</div>
                  {item.category && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.category}</div>
                  )}
                  {item.description && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{item.description}</div>
                  )}
                </div>
                {type === 'exercise' && (item.defaultSets || item.defaultReps) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0 text-right">
                    {item.defaultSets && `${item.defaultSets} sets`}
                    {item.defaultSets && item.defaultReps && ' · '}
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
