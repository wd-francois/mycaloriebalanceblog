import React, { useMemo, useState, useEffect, useRef } from 'react';
import Calendar from '@react/Calendar';
import TimePicker from '@react/TimePicker';
import AutocompleteInput from './AutocompleteInput';
import GroupedEntries from './GroupedEntries';
import healthDB from '../lib/database.js';
import { SettingsProvider } from '../contexts/SettingsContext.jsx';
import { formatDate, formatTime } from '../lib/utils';
import { getCurrentTimeParts, calculateSleepDuration } from '../lib/dateUtils';
import { exportToJSON, exportToCSV, exportToPDF } from '../lib/exportUtils';
import { useHealthData } from '../hooks/useHealthData';
import { useFormState } from '../hooks/useFormState';
import { usePhotoManagement } from '../hooks/usePhotoManagement';



const DateTimeSelector = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [time, setTime] = useState(() => getCurrentTimeParts());
  const [showModal, setShowModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Entries state managed by useHealthData hook
  const { entries, loading, isDBInitialized, addEntry, updateEntry, deleteEntry } = useHealthData();

  // Library state
  const [librarySuccessMessage, setLibrarySuccessMessage] = useState('');

  // Form visibility state
  const [showMealInput, setShowMealInput] = useState(false);
  const [showExerciseInput, setShowExerciseInput] = useState(false);
  const [showSleepInput, setShowSleepInput] = useState(false);
  const [showMeasurementsInput, setShowMeasurementsInput] = useState(false);

  // Other state
  const [frequentItems, setFrequentItems] = useState({ food: [], exercise: [] });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [infoFormData, setInfoFormData] = useState({ notes: '' });
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [collapsedTimes, setCollapsedTimes] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    weightUnit: 'kg',
    lengthUnit: 'cm',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    enableMeasurements: true,
    enableExercise: true,
    enableSleep: true,
    enableQuickAddFood: true,
    enableQuickAddExercise: true,
    enableMeals: true
  });
  const processedUrlParams = useRef(new Set());
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  // Auto-add to library function (needed by useFormState)
  const addToLibrary = async (entry) => {
    try {
      if (!isDBInitialized) return;

      if (entry.type === 'meal') {
        const foodData = {
          name: entry.name,
          amount: entry.amount || '',
          calories: entry.calories || '',
          protein: entry.protein || '',
          carbs: entry.carbs || '',
          fats: entry.fats || ''
        };

        const existingFoods = await healthDB.getFoodItems(entry.name, 100);
        const isDuplicate = existingFoods.some(food =>
          food.name.toLowerCase() === entry.name.toLowerCase() &&
          food.calories === foodData.calories &&
          food.protein === foodData.protein
        );

        if (!isDuplicate) {
          await healthDB.saveFoodItem(foodData);
          console.log('Food added to database library:', entry.name);
        }
      } else if (entry.type === 'exercise') {
        const exerciseData = {
          name: entry.name,
          defaultSets: entry.sets?.length || 1,
          defaultReps: entry.sets?.[0]?.reps || '',
          defaultLoad: entry.sets?.[0]?.load || ''
        };

        const existingExercises = await healthDB.getExerciseItems(entry.name, 100);
        const isDuplicate = existingExercises.some(ex =>
          ex.name.toLowerCase() === entry.name.toLowerCase()
        );

        if (!isDuplicate) {
          await healthDB.saveExerciseItem(exerciseData);
          console.log('Exercise added to database library:', entry.name);
        }
      }
    } catch (error) {
      console.error('Error adding to library:', error);
    }
  };

  // Form state managed by useFormState hook
  const {
    formState,
    setFormState,
    formError,
    setFormError,
    formSuccessMessage,
    activeForm,
    setActiveForm,
    handleSubmit,
    handleSubmitWithData,
    loadEntryForEdit
  } = useFormState(addEntry, updateEntry, addToLibrary);

  // Photo management handled by usePhotoManagement hook
  const {
    photoSaveMessage,
    photoSaveError,
    cameraInputRef,
    uploadInputRef,
    handlePhotoSelection,
    removePhoto,
    triggerCameraCapture,
    triggerPhotoUpload,
    handleSavePhotoToGallery
  } = usePhotoManagement(formState, setFormState, setFormError);



  // Load form state and settings from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;

    // Initialize selectedDate immediately to prevent loading state
    const initializeDate = () => {
      try {
        // Check URL for date parameter first before setting default date
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');

        if (dateParam) {
          try {
            const [year, month, day] = dateParam.split('-').map(Number);
            const urlDate = new Date(year, month - 1, day);
            if (!isNaN(urlDate.getTime())) {
              setSelectedDate(new Date(urlDate.getFullYear(), urlDate.getMonth(), urlDate.getDate()));
              return;
            }
          } catch (error) {
            console.error('Error parsing date param:', error);
          }
        }
        // Default to today's date
        setSelectedDate(new Date());
      } catch (error) {
        console.error('Error initializing date:', error);
        // Fallback to today's date
        setSelectedDate(new Date());
      }
    };

    // Initialize date immediately
    if (selectedDate === null) {
      initializeDate();
    }

    // Also set a timeout fallback in case something goes wrong
    const timeoutId = setTimeout(() => {
      if (selectedDate === null) {
        console.warn('selectedDate still null after timeout, setting to today');
        setSelectedDate(new Date());
      }
    }, 1000);

    return () => clearTimeout(timeoutId);

    // Check if we have edit/info URL params - if so, don't load form state from localStorage
    const urlParamsCheck = new URLSearchParams(window.location.search);
    const hasEditOrInfo = urlParamsCheck.get('edit') || urlParamsCheck.get('info');

    // Load form state only if not editing/adding info
    if (!hasEditOrInfo) {
      try {
        const savedFormState = localStorage.getItem('healthFormState');
        if (savedFormState) {
          const parsed = JSON.parse(savedFormState);
          setFormState(parsed);
          setActiveForm(parsed.type || 'meal');

          // Don't automatically show forms on page load - forms should be hidden by default
          // Forms will only show when user explicitly clicks the buttons
          console.log('Loaded form state from localStorage:', parsed);
        }
      } catch (error) {
        console.error('Error loading form state from localStorage:', error);
      }
    } else {
      console.log('Skipping localStorage form state load - edit/info params detected');
    }

    // Load settings
    try {
      const savedSettings = localStorage.getItem('healthTrackerSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed, enableMeasurements: true })); // Force enable measurements
        console.log('Loaded settings from localStorage:', parsed);
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (showModal && formState.id == null) {
      setTime(getCurrentTimeParts());
    }
  }, [showModal, formState.id]);

  // Open modal when navigating with date and add parameter
  useEffect(() => {
    if (typeof window === 'undefined' || !isDBInitialized || showModal) return;

    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const addParam = urlParams.get('add');

    // If we have a date and add parameter, open the modal (only if modal is not already open)
    if (dateParam && addParam === 'true' && selectedDate) {
      // Use requestAnimationFrame to open immediately on next frame, avoiding calendar flash
      const frameId = requestAnimationFrame(() => {
        // Double-check URL params haven't changed (user might have clicked back)
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('add') === 'true') {
          setShowModal(true);
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [isDBInitialized, selectedDate, showModal]);

  // Ensure measurements are always enabled
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setSettings(prev => {
      if (!prev.enableMeasurements) {
        const updatedSettings = { ...prev, enableMeasurements: true };
        // Save to localStorage
        localStorage.setItem('healthTrackerSettings', JSON.stringify(updatedSettings));
        return updatedSettings;
      }
      return prev;
    });
  }, []);

  // Initialize database and load data on component mount
  // Database initialization and data loading handled by useHealthData hook

  // Load frequent items when database is initialized
  useEffect(() => {
    if (isDBInitialized) {
      loadFrequentItems();
    }
  }, [isDBInitialized]);

  // Entries saving handled by useHealthData hook


  // Save form state to localStorage whenever it changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    try {
      console.log('Saving form state to localStorage:', formState);
      localStorage.setItem('healthFormState', JSON.stringify(formState));
      console.log('Successfully saved form state to localStorage');
    } catch (error) {
      console.error('Error saving form state to localStorage:', error);
    }
  }, [formState]);




  const headerText = useMemo(() => {
    if (!selectedDate) return '';
    return formatDate(selectedDate);
  }, [selectedDate]);

  // Prevent body scroll when info modal is open
  useEffect(() => {
    if (showInfoModal) {
      // Store current scroll position
      const scrollY = window.scrollY;
      // Prevent body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showInfoModal]);

  // Get entries for the current selected date
  const currentDateEntries = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toDateString();
    return entries[dateKey] || [];
  }, [entries, selectedDate]);

  // Get entries for today (for Today's Summary card)
  const todayEntries = useMemo(() => {
    const today = new Date();
    // Normalize to midnight to ensure consistent matching
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayTime = normalizedToday.getTime();

    // Try multiple date key formats to find entries
    const todayKey = normalizedToday.toDateString();
    const todayISO = normalizedToday.toISOString().split('T')[0];

    // Try exact match first
    let todayEntriesList = entries[todayKey] || [];

    // If no exact match, try ISO format
    if (todayEntriesList.length === 0) {
      todayEntriesList = entries[todayISO] || [];
    }

    // If still no match, iterate through all entries and find matches by comparing dates
    if (todayEntriesList.length === 0 && Object.keys(entries).length > 0) {
      const allTodayEntries = [];
      Object.keys(entries).forEach(dateKey => {
        const entriesForDate = entries[dateKey] || [];
        entriesForDate.forEach(entry => {
          if (entry.date) {
            let entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
            entryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            if (entryDate.getTime() === todayTime) {
              allTodayEntries.push(entry);
            }
          }
        });
      });
      todayEntriesList = allTodayEntries;
    }

    console.log('Today entries lookup:', {
      today: normalizedToday.toISOString(),
      todayKey,
      todayISO,
      foundEntries: todayEntriesList.length,
      availableKeys: Object.keys(entries),
      firstFewKeys: Object.keys(entries).slice(0, 5)
    });
    return todayEntriesList;
  }, [entries]);

  // Group entries by time
  const groupedEntries = useMemo(() => {
    const groups = {};
    currentDateEntries.forEach(entry => {
      const timeKey = formatTime(entry.time);
      if (!groups[timeKey]) {
        groups[timeKey] = [];
      }
      groups[timeKey].push(entry);
    });

    // Sort groups by time
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      const timeA = groups[a][0].time;
      const timeB = groups[b][0].time;

      // Convert to 24-hour format for comparison
      const hourA = timeA.period === 'AM' ? (timeA.hour === 12 ? 0 : timeA.hour) : (timeA.hour === 12 ? 12 : timeA.hour + 12);
      const hourB = timeB.period === 'AM' ? (timeB.hour === 12 ? 0 : timeB.hour) : (timeB.hour === 12 ? 12 : timeB.hour + 12);

      if (hourA !== hourB) return hourA - hourB;
      return timeA.minute - timeB.minute;
    });

    return sortedGroups.map(timeKey => ({
      time: timeKey,
      entries: groups[timeKey]
    }));
  }, [currentDateEntries]);

  // Toggle time group collapse
  const toggleTimeGroup = (timeKey) => {
    setCollapsedTimes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timeKey)) {
        newSet.delete(timeKey);
      } else {
        newSet.add(timeKey);
      }
      return newSet;
    });
  };

  // Calculate total sleep duration for the selected date
  const totalSleepDuration = useMemo(() => {
    const sleepEntries = currentDateEntries.filter(entry => entry.type === 'sleep');
    if (sleepEntries.length === 0) return null;

    let totalMinutes = 0;
    sleepEntries.forEach(entry => {
      if (entry.duration) {
        // Parse duration string like "8h 30m" or "7h" or "45m"
        const duration = entry.duration;
        const hoursMatch = duration.match(/(\d+)h/);
        const minutesMatch = duration.match(/(\d+)m/);

        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

        totalMinutes += hours * 60 + minutes;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalHours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${totalHours}h`;
    } else {
      return `${totalHours}h ${remainingMinutes}m`;
    }
  }, [currentDateEntries]);

  // Calculate total sleep duration for today (for Today's Summary card)
  const todaySleepDuration = useMemo(() => {
    const sleepEntries = todayEntries.filter(entry => entry.type === 'sleep');
    if (sleepEntries.length === 0) return null;

    let totalMinutes = 0;
    sleepEntries.forEach(entry => {
      if (entry.duration) {
        // Parse duration string like "8h 30m" or "7h" or "45m"
        const duration = entry.duration;
        const hoursMatch = duration.match(/(\d+)h/);
        const minutesMatch = duration.match(/(\d+)m/);

        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

        totalMinutes += hours * 60 + minutes;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalHours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${totalHours}h`;
    } else {
      return `${totalHours}h ${remainingMinutes}m`;
    }
  }, [todayEntries]);

  function handleDateSelect(date) {
    setSelectedDate(date);
    // Reset form state to ensure "Add New Entry" is shown, not "Edit"
    setFormState({
      id: null,
      name: '',
      type: 'meal',
      sets: [],
      amount: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
      bedtime: { hour: 10, minute: 0, period: 'PM' },
      waketime: { hour: 6, minute: 0, period: 'AM' },
      duration: '',
      intensity: '',
      quality: '',
      weight: '',
      neck: '',
      shoulders: '',
      chest: '',
      waist: '',
      hips: '',
      thigh: '',
      arm: '',
      calf: '',
      chestSkinfold: '',
      abdominalSkinfold: '',
      thighSkinfold: '',
      tricepSkinfold: '',
      subscapularSkinfold: '',
      suprailiacSkinfold: '',
      notes: '',
      photo: null
    });
    // Reset activeForm to meal (default) so buttons show in neutral state
    setActiveForm('meal');
    // Close any open form inputs
    setShowMealInput(false);
    setShowExerciseInput(false);
    setShowSleepInput(false);
    setShowMeasurementsInput(false);
    setShowModal(true);
  }

  function closeModal(e) {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Clear URL parameters first to prevent useEffect from reopening modal
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('add') === 'true') {
        const dateParam = urlParams.get('date');
        // Navigate to clean URL without add parameter
        if (dateParam) {
          window.history.replaceState({}, '', `/?date=${dateParam}`);
        } else {
          window.history.replaceState({}, '', '/');
        }
      }
    }

    // Close the modal
    setShowModal(false);

    // Reset form inputs to ensure clean state
    setShowMealInput(false);
    setShowExerciseInput(false);
    setShowSleepInput(false);
    setShowMeasurementsInput(false);
  }



  // Functions to handle individual sets
  function addSet() {
    setFormState(prev => ({
      ...prev,
      sets: [...prev.sets, { reps: '', load: '' }]
    }));
  }

  function updateSet(index, field, value) {
    setFormState(prev => ({
      ...prev,
      sets: prev.sets.map((set, i) =>
        i === index ? { ...set, [field]: value } : set
      )
    }));
  }

  function removeSet(index) {
    setFormState(prev => ({
      ...prev,
      sets: prev.sets.filter((_, i) => i !== index)
    }));
  }

  function handleDelete(id) {
    if (!selectedDate) return;
    deleteEntry(id, selectedDate);
    if (formState.id === id) {
      resetForm();
    }
  }

  // Handle autocomplete selection
  const handleAutocompleteSelect = (item) => {
    if (activeForm === 'meal' && item) {
      // Populate meal form with library item data
      setFormState(prev => ({
        ...prev,
        name: item.name || prev.name,
        amount: item.amount || prev.amount,
        calories: item.calories || prev.calories,
        protein: item.protein || prev.protein,
        carbs: item.carbs || prev.carbs,
        fats: item.fats || prev.fats,
        fibre: item.fibre || prev.fibre,
        other: item.other || prev.other
      }));
    } else if (activeForm === 'exercise' && item.defaultSets && item.defaultReps) {
      // Create a default set with the exercise's default values
      const defaultSet = {
        reps: item.defaultReps.toString(),
        load: item.defaultLoad || ''
      };

      setFormState(prev => ({
        ...prev,
        sets: [defaultSet]
      }));
    }
  };

  // Handle quick add
  const handleQuickAdd = (item, type) => {
    if (type === 'exercise' && item.defaultSets && item.defaultReps) {
      // Create a default set with the exercise's default values
      const defaultSet = {
        reps: item.defaultReps.toString(),
        load: item.defaultLoad || ''
      };

      setFormState(prev => ({
        ...prev,
        name: item.name,
        type: type,
        sets: [defaultSet]
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        name: item.name,
        type: type
      }));
    }

    if (type === 'meal') {
      setActiveForm('meal');
      setShowMealInput(true);
    } else if (type === 'exercise') {
      setActiveForm('exercise');
      setShowExerciseInput(true);
    }
  };

  // Handle quick add management
  const handleOpenQuickAddManager = (type) => {
    setQuickAddType(type);
    setShowQuickAddManager(true);
  };

  // Handle settings update
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Only run on client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthTrackerSettings', JSON.stringify(newSettings));
    }
  };



  // Load frequent items
  const loadFrequentItems = async () => {
    try {
      const [foodItems, exerciseItems] = await Promise.all([
        healthDB.getFoodItems('', 5),
        healthDB.getExerciseItems('', 5)
      ]);

      setFrequentItems({
        food: foodItems || [],
        exercise: exerciseItems || []
      });
    } catch (error) {
      console.error('Error loading frequent items:', error);
      // Set empty arrays as fallback
      setFrequentItems({
        food: [],
        exercise: []
      });
    }
  };

  const toggleQuickAddItem = async (item, type) => {
    try {
      const currentFrequentItems = frequentItems[type];
      const isCurrentlyFrequent = currentFrequentItems.some(frequentItem => frequentItem.id === item.id);

      if (isCurrentlyFrequent) {
        // Remove from frequent items
        const updatedFrequentItems = currentFrequentItems.filter(frequentItem => frequentItem.id !== item.id);
        setFrequentItems(prev => ({
          ...prev,
          [type]: updatedFrequentItems
        }));
      } else {
        // Add to frequent items (limit to 5 items)
        if (currentFrequentItems.length < 5) {
          const updatedFrequentItems = [...currentFrequentItems, item];
          setFrequentItems(prev => ({
            ...prev,
            [type]: updatedFrequentItems
          }));
        } else {
          alert(`You can only have up to 5 quick add items. Please remove one first.`);
        }
      }
    } catch (error) {
      console.error('Error toggling quick add item:', error);
    }
  };

  // Handle information modal
  const handleInfoClick = (entry) => {
    setSelectedEntry(entry);
    setInfoFormData({
      notes: entry.notes || ''
    });
    setShowInfoModal(true);
  };

  const handleInfoSave = async () => {
    if (!selectedEntry || !selectedDate) return;

    try {
      // Update the entry with new notes
      const updatedEntry = {
        ...selectedEntry,
        notes: infoFormData.notes
      };
      await updateEntry(updatedEntry);

      setShowInfoModal(false);
      setSelectedEntry(null);
      setInfoFormData({ notes: '' });
    } catch (error) {
      console.error('Error saving info:', error);
    }
  };

  const handleInfoCancel = () => {
    setShowInfoModal(false);
    setSelectedEntry(null);
    setInfoFormData({ notes: '' });
  };

  // Handle URL parameters for edit and info actions
  useEffect(() => {
    if (typeof window === 'undefined' || !isDBInitialized) {
      console.log('URL params check skipped - isDBInitialized:', isDBInitialized);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const editParam = urlParams.get('edit');
    const infoParam = urlParams.get('info');

    // Create a unique key for this URL param combination
    const urlKey = `${dateParam || ''}-${editParam || ''}-${infoParam || ''}`;

    // Skip if we've already processed these params
    if (processedUrlParams.current.has(urlKey)) {
      console.log('URL params already processed, skipping:', urlKey);
      return;
    }

    console.log('URL params check:', { dateParam, editParam, infoParam, entriesCount: Object.keys(entries).length });

    // Skip if no action params
    if (!editParam && !infoParam) {
      console.log('No edit/info params, skipping');
      return;
    }

    // Clear any existing form state to prevent showing old data
    if (editParam) {
      // Set loading flag to prevent form from showing old data
      setIsLoadingEdit(true);
      // Reset form state and close any open forms immediately
      setShowMealInput(false);
      setShowExerciseInput(false);
      setShowSleepInput(false);
      setShowMeasurementsInput(false);
      setShowModal(true);
    }

    // Set date from URL if provided
    if (dateParam) {
      try {
        const [year, month, day] = dateParam.split('-').map(Number);
        const urlDate = new Date(year, month - 1, day);
        if (!isNaN(urlDate.getTime())) {
          const normalizedDate = new Date(urlDate.getFullYear(), urlDate.getMonth(), urlDate.getDate());
          console.log('Setting date from URL:', normalizedDate);
          setSelectedDate(normalizedDate);
        }
      } catch (error) {
        console.error('Error parsing date from URL:', error);
      }
    }

    // Wait for entries to be loaded before processing edit/info
    if (Object.keys(entries).length === 0) {
      console.log('Waiting for entries to load...');
      return;
    }

    // Handle edit action
    if (editParam) {
      console.log('Looking for entry with ID:', editParam);
      // Find the entry across all dates
      let foundEntry = null;
      let foundDateKey = null;
      for (const dateKey in entries) {
        const entryList = entries[dateKey];
        console.log(`Checking date ${dateKey}, ${entryList.length} entries`);
        foundEntry = entryList.find(e => {
          const entryIdStr = String(e.id);
          const paramIdStr = String(editParam);
          const match = entryIdStr === paramIdStr;
          if (match) {
            console.log(`Match found! Entry ID: ${entryIdStr}, Param ID: ${paramIdStr}`);
          }
          return match;
        });
        if (foundEntry) {
          foundDateKey = dateKey;
          console.log('Found entry for edit:', foundEntry, 'on date:', dateKey);
          break;
        }
      }

      if (foundEntry) {
        console.log('Processing edit for entry:', foundEntry);
        // Mark as processed immediately
        processedUrlParams.current.add(urlKey);

        // Call handleEdit immediately without setTimeout - set form state directly
        // Close any open forms first
        setShowMealInput(false);
        setShowExerciseInput(false);
        setShowSleepInput(false);
        setShowMeasurementsInput(false);

        // Set form state directly (like Library Manager does)
        if (foundEntry.time) {
          setTime(foundEntry.time);
        }

        // Set the date from the entry if available
        if (foundEntry.date) {
          const entryDate = foundEntry.date instanceof Date ? foundEntry.date : new Date(foundEntry.date);
          setSelectedDate(new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()));
        }

        setFormState({
          id: foundEntry.id,
          name: foundEntry.name,
          type: foundEntry.type,
          sets: foundEntry.sets || [],
          amount: foundEntry.amount || '',
          calories: foundEntry.calories || '',
          protein: foundEntry.protein || '',
          carbs: foundEntry.carbs || '',
          fats: foundEntry.fats || '',
          bedtime: foundEntry.bedtime || { hour: 10, minute: 0, period: 'PM' },
          waketime: foundEntry.waketime || { hour: 6, minute: 0, period: 'AM' },
          duration: foundEntry.duration || '',
          intensity: foundEntry.intensity || '',
          quality: foundEntry.quality || '',
          weight: foundEntry.weight || '',
          neck: foundEntry.neck || '',
          shoulders: foundEntry.shoulders || '',
          chest: foundEntry.chest || '',
          waist: foundEntry.waist || '',
          hips: foundEntry.hips || '',
          thigh: foundEntry.thigh || '',
          arm: foundEntry.arm || '',
          calf: foundEntry.calf || '',
          chestSkinfold: foundEntry.chestSkinfold || '',
          abdominalSkinfold: foundEntry.abdominalSkinfold || '',
          thighSkinfold: foundEntry.thighSkinfold || '',
          tricepSkinfold: foundEntry.tricepSkinfold || '',
          subscapularSkinfold: foundEntry.subscapularSkinfold || '',
          suprailiacSkinfold: foundEntry.suprailiacSkinfold || '',
          notes: foundEntry.notes || '',
          photo: foundEntry.photo || null
        });

        setActiveForm(foundEntry.type);
        setShowModal(true);

        // Show the appropriate form input
        if (foundEntry.type === 'meal') {
          setShowMealInput(true);
        } else if (foundEntry.type === 'exercise') {
          setShowExerciseInput(true);
        } else if (foundEntry.type === 'sleep') {
          setShowSleepInput(true);
        } else if (foundEntry.type === 'measurements') {
          setShowMeasurementsInput(true);
        }

        // Clear loading flag now that form is ready
        setIsLoadingEdit(false);

        // Clean up URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('edit');
        window.history.replaceState({}, '', newUrl);
      } else {
        console.error('Entry not found for edit ID:', editParam);
        console.error('Available entries:', entries);
        // Log all entry IDs for debugging
        const allEntryIds = [];
        for (const dateKey in entries) {
          entries[dateKey].forEach(e => allEntryIds.push({ id: e.id, idType: typeof e.id, name: e.name, date: dateKey }));
        }
        console.error('All entry IDs:', allEntryIds);
      }
    }

    // Handle info action
    if (infoParam) {
      console.log('Looking for entry with ID:', infoParam);
      // Find the entry across all dates
      let foundEntry = null;
      for (const dateKey in entries) {
        const entryList = entries[dateKey];
        console.log(`Checking date ${dateKey}, ${entryList.length} entries`);
        foundEntry = entryList.find(e => {
          const entryIdStr = String(e.id);
          const paramIdStr = String(infoParam);
          const match = entryIdStr === paramIdStr;
          if (match) {
            console.log(`Match found! Entry ID: ${entryIdStr}, Param ID: ${paramIdStr}`);
          }
          return match;
        });
        if (foundEntry) {
          console.log('Found entry for info:', foundEntry, 'on date:', dateKey);
          break;
        }
      }

      if (foundEntry) {
        console.log('Processing info for entry:', foundEntry);
        // Mark as processed
        processedUrlParams.current.add(urlKey);
        // Use setTimeout to ensure state updates are processed
        setTimeout(() => {
          handleInfoClick(foundEntry);
          // Clean up URL
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('info');
          window.history.replaceState({}, '', newUrl);
        }, 300);
      } else {
        console.error('Entry not found for info ID:', infoParam);
        console.error('Available entries:', entries);
      }
    }
  }, [isDBInitialized, entries]);

  // Drag and drop handlers
  const handleDragStart = (e, entry) => {
    setDraggedEntry(entry);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedEntry(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Note: Drag and drop reordering is temporarily disabled as it requires
  // additional implementation with the centralized data hook
  const handleDrop = (e, targetEntry) => {
    e.preventDefault();
    // TODO: Implement reordering with useHealthData hook
    console.log('Drag and drop reordering is currently disabled');
  };

  // Don't render on server side
  if (!isClient) {
    return <div>Loading...</div>;
  }

  // Ensure selectedDate is always set (fallback to today if somehow null)
  // This prevents the page from being stuck on loading
  if (!selectedDate) {
    // This should not happen, but if it does, set it immediately and return loading
    // The useEffect will set it properly on next render
    if (typeof window !== 'undefined') {
      setSelectedDate(new Date());
    }
    return <div>Loading...</div>;
  }

  // Check for edit/info URL params to hide calendar initially
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hasEditOrInfoParam = urlParams && (urlParams.get('edit') || urlParams.get('info'));

  return (
    <div className="w-full">
      {!hasEditOrInfoParam && (
        <div className="w-full min-h-[calc(100vh-160px)] bg-white flex items-center md:items-start justify-center overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <div className="max-w-sm mx-auto flex flex-col gap-4 sm:gap-6 px-3 sm:px-4 w-full py-4 md:py-6 pb-8 md:pb-12">
            {/* Calendar Card */}
            <div>
              {isClient && <Calendar selectedDate={selectedDate} onSelectDate={handleDateSelect} entries={entries} />}
            </div>

            {/* Today's Summary Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Today's Summary</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-xl">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {todayEntries.filter(e => e.type === 'meal').length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Meals</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-xl">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {todaySleepDuration || '—'}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Sleep</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-50 rounded-xl">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {todayEntries.filter(e => e.type === 'measurements').length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">Measured</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showModal || hasEditOrInfoParam) && (
        <div className="fixed inset-0 z-50 w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col overflow-hidden">
          {/* Header with Glassmorphism */}
          <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm flex-shrink-0">
            <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center justify-between gap-1 sm:gap-2 md:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
                  <button
                    onClick={closeModal}
                    className="flex items-center justify-center p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title="Back"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate min-w-0">
                    {headerText}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-blue-100 hover:shadow-md"
                    title="Open settings"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden sm:inline">My Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content - Centered vertically between header and bottom nav */}
          <div className={`flex-1 overflow-y-auto min-h-0 ${!(showMealInput || showSleepInput || showMeasurementsInput) ? 'flex items-center justify-center' : ''}`} style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <div className={`max-w-4xl mx-auto px-4 sm:px-6 w-full ${!(showMealInput || showSleepInput || showMeasurementsInput) ? '' : 'py-4 md:py-8'}`}>
              {/* Entry Form */}
              <div className={`w-full ${(showMealInput || showSleepInput || showMeasurementsInput) ? 'max-w-2xl mx-auto' : 'max-w-[380px] md:max-w-4xl'} ${(showMealInput || showSleepInput || showMeasurementsInput) ? '' : 'border border-gray-200 rounded-3xl overflow-hidden shadow-lg bg-white p-6 md:p-8 space-y-6'}`}>
                {!(showMealInput || showSleepInput || showMeasurementsInput) && (
                  <h2 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formState.id == null ? 'Add a New Entry' : `Edit ${activeForm.charAt(0).toUpperCase() + activeForm.slice(1)} Entry`}
                  </h2>
                )}

                <form className={(showMealInput || showSleepInput || showMeasurementsInput) ? '' : 'space-y-6'}>
                  {/* Desktop Layout: Single column when form is active, side by side otherwise */}
                  {!(showMealInput || showSleepInput || showMeasurementsInput) && (
                    <div className={`md:grid md:grid-cols-2 md:gap-6 md:space-y-0 space-y-6`}>
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* Time Picker */}
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-5 rounded-2xl space-y-2 border border-blue-100">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Time
                          </label>
                          <div className="flex items-center gap-3">
                            <select
                              className="p-3 rounded-xl bg-white border border-gray-200 flex-1 text-sm md:text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              value={time.hour}
                              onChange={(e) => setTime({ ...time, hour: Number(e.target.value) })}
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <select
                              className="p-3 rounded-xl bg-white border border-gray-200 flex-1 text-sm md:text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              value={time.minute}
                              onChange={(e) => setTime({ ...time, minute: Number(e.target.value) })}
                            >
                              {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                              ))}
                            </select>
                            <select
                              className="p-3 rounded-xl bg-white border border-gray-200 flex-1 text-sm md:text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              value={time.period}
                              onChange={(e) => setTime({ ...time, period: e.target.value })}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                          {settings.enableMeals && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveForm('meal');
                                setShowMealInput(true);
                              }}
                              className={`py-3 md:py-4 rounded-2xl font-medium shadow-sm active:scale-[0.97] transition-all text-sm md:text-base ${showMealInput
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:shadow-md'
                                }`}
                            >
                              🍽️ Meal
                            </button>
                          )}
                          {settings.enableSleep && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveForm('sleep');
                                setShowSleepInput(true);
                              }}
                              className={`py-3 md:py-4 rounded-2xl font-medium shadow-sm active:scale-[0.97] transition-all text-sm md:text-base ${showSleepInput
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:shadow-md'
                                }`}
                            >
                              🛌 Sleep
                            </button>
                          )}
                          {settings.enableMeasurements && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveForm('measurements');
                                setShowMeasurementsInput(true);
                              }}
                              className={`py-3 md:py-4 rounded-2xl font-medium shadow-sm active:scale-[0.97] transition-all text-sm md:text-base ${showMeasurementsInput
                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 hover:shadow-md'
                                }`}
                            >
                              📏 Measure
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Photo Upload */}
                      {activeForm !== 'sleep' && activeForm !== 'measurements' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 md:p-5 space-y-3 bg-gradient-to-br from-gray-50 to-blue-50 hover:border-blue-400 transition-all duration-200">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm md:text-base font-medium text-gray-700 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Attach Photo (optional)
                            </p>
                            {formState.photo && (
                              <button
                                type="button"
                                onClick={removePhoto}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={triggerCameraCapture}
                              className="flex-1 border-2 border-blue-300 py-3 md:py-4 rounded-xl font-medium text-blue-700 bg-white active:scale-[0.97] transition-all hover:bg-blue-50 hover:border-blue-500 hover:shadow-md text-sm md:text-base"
                            >
                              📷 Take Photo
                            </button>
                            <button
                              type="button"
                              onClick={triggerPhotoUpload}
                              className="flex-1 border-2 border-blue-300 py-3 md:py-4 rounded-xl font-medium text-blue-700 bg-white active:scale-[0.97] transition-all hover:bg-blue-50 hover:border-blue-500 hover:shadow-md text-sm md:text-base"
                            >
                              ⬆️ Upload
                            </button>
                          </div>
                          {formState.photo && (
                            <div className="mt-3">
                              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                <img
                                  src={formState.photo.dataUrl}
                                  alt="Entry attachment preview"
                                  className="w-full max-h-80 object-cover"
                                />
                              </div>
                              <p className="mt-2 text-xs text-gray-600">
                                {formState.photo.name ? `${formState.photo.name} • ` : ''}
                                {new Date(formState.photo.capturedAt).toLocaleString()}
                              </p>
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => handleSavePhotoToGallery(selectedDate, time, activeForm, isDBInitialized, addEntry)}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-colors duration-200 text-sm"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Save Photo to Gallery
                                </button>
                                {photoSaveMessage && (
                                  <span className="ml-2 text-sm text-green-600">{photoSaveMessage}</span>
                                )}
                                {!photoSaveMessage && photoSaveError && (
                                  <span className="ml-2 text-sm text-red-600">{photoSaveError}</span>
                                )}
                              </div>
                            </div>
                          )}

                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(event) => handlePhotoSelection(event, 'camera')}
                          />
                          <input
                            ref={uploadInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => handlePhotoSelection(event, 'library')}
                          />
                        </div>
                      )}
                    </div>
                  )}


                  {/* Meal Form Fields */}
                  {settings.enableMeals && activeForm === 'meal' && showMealInput && !isLoadingEdit && (
                    <div className="pt-6 px-4 pb-6 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Add Meal</h4>
                        <button
                          onClick={() => {
                            setShowMealInput(false);
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-name">
                            Meal Name
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <AutocompleteInput
                                type="food"
                                value={formState.name}
                                onChange={(value) => setFormState((s) => ({ ...s, name: value }))}
                                onSelect={handleAutocompleteSelect}
                                placeholder="e.g., Breakfast, Lunch, Dinner, Snack"
                                autoFocus
                                id="meal-name"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-amount">
                            Amount
                          </label>
                          <input
                            id="meal-amount"
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            placeholder="e.g., 1 cup, 500 grams, 2 slices"
                            value={formState.amount}
                            onChange={(e) => setFormState((s) => ({ ...s, amount: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          />
                        </div>

                        {/* Nutrition Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-calories">
                              Calories
                            </label>
                            <input
                              id="meal-calories"
                              type="number"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="e.g., 250"
                              value={formState.calories}
                              onChange={(e) => setFormState((s) => ({ ...s, calories: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-protein">
                              Protein (g)
                            </label>
                            <input
                              id="meal-protein"
                              type="number"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="e.g., 20"
                              value={formState.protein}
                              onChange={(e) => setFormState((s) => ({ ...s, protein: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-carbs">
                              Carbs (g)
                            </label>
                            <input
                              id="meal-carbs"
                              type="number"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="e.g., 30"
                              value={formState.carbs}
                              onChange={(e) => setFormState((s) => ({ ...s, carbs: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-fats">
                              Fats (g)
                            </label>
                            <input
                              id="meal-fats"
                              type="number"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="e.g., 10"
                              value={formState.fats}
                              onChange={(e) => setFormState((s) => ({ ...s, fats: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-fibre">
                              Fibre (g)
                            </label>
                            <input
                              id="meal-fibre"
                              type="number"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="e.g., 5"
                              value={formState.fibre}
                              onChange={(e) => setFormState((s) => ({ ...s, fibre: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-other">
                              Other
                            </label>
                            <input
                              id="meal-other"
                              type="text"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="e.g., Additional notes or nutrients"
                              value={formState.other}
                              onChange={(e) => setFormState((s) => ({ ...s, other: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pb-4">
                          <button
                            type="button"
                            onClick={(e) => handleSubmit(e, time, selectedDate, { setShowMealInput, setShowExerciseInput, setShowSleepInput, setShowMeasurementsInput })}
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {formState.id == null ? 'Add Meal Entry' : 'Save Changes'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowMealInput(false);
                            }}
                            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            {formState.id == null ? 'Cancel' : 'Cancel Edit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Sleep Form Fields */}
                  {settings.enableSleep && activeForm === 'sleep' && showSleepInput && !isLoadingEdit && (
                    <div className="pt-6 px-4 pb-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Add Sleep</h4>
                        <button
                          onClick={() => {
                            setShowSleepInput(false);
                            setActiveForm('meal');
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-4">
                        {/* Bedtime and Wake Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bedtime
                            </label>
                            <div className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg">
                              <div className="flex flex-col items-center">
                                <label className="text-xs font-medium text-gray-600 mb-1">Hour</label>
                                <select
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                  value={formState.bedtime.hour}
                                  onChange={(e) => setFormState((s) => ({
                                    ...s,
                                    bedtime: { ...s.bedtime, hour: Number(e.target.value) }
                                  }))}
                                >
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="text-gray-400 text-2xl font-bold">:</div>
                              <div className="flex flex-col items-center">
                                <label className="text-xs font-medium text-gray-600 mb-1">Minute</label>
                                <select
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                  value={formState.bedtime.minute}
                                  onChange={(e) => setFormState((s) => ({
                                    ...s,
                                    bedtime: { ...s.bedtime, minute: Number(e.target.value) }
                                  }))}
                                >
                                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col items-center">
                                <label className="text-xs font-medium text-gray-600 mb-1">Period</label>
                                <select
                                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                  value={formState.bedtime.period}
                                  onChange={(e) => setFormState((s) => ({
                                    ...s,
                                    bedtime: { ...s.bedtime, period: e.target.value }
                                  }))}
                                >
                                  <option value="PM">PM</option>
                                  <option value="AM">AM</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Wake Time
                            </label>
                            <div className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg">
                              <div className="flex flex-col items-center">
                                <label className="text-xs font-medium text-gray-600 mb-1">Hour</label>
                                <select
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                  value={formState.waketime.hour}
                                  onChange={(e) => setFormState((s) => ({
                                    ...s,
                                    waketime: { ...s.waketime, hour: Number(e.target.value) }
                                  }))}
                                >
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="text-gray-400 text-2xl font-bold">:</div>
                              <div className="flex flex-col items-center">
                                <label className="text-xs font-medium text-gray-600 mb-1">Minute</label>
                                <select
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                  value={formState.waketime.minute}
                                  onChange={(e) => setFormState((s) => ({
                                    ...s,
                                    waketime: { ...s.waketime, minute: Number(e.target.value) }
                                  }))}
                                >
                                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col items-center">
                                <label className="text-xs font-medium text-gray-600 mb-1">Period</label>
                                <select
                                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                  value={formState.waketime.period}
                                  onChange={(e) => setFormState((s) => ({
                                    ...s,
                                    waketime: { ...s.waketime, period: e.target.value }
                                  }))}
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sleep Duration Display */}
                        <div className="bg-white border border-purple-200 rounded-lg p-4">
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-1">Total Sleep Duration</div>
                            <div className="text-2xl font-bold text-purple-600">
                              {calculateSleepDuration(formState.bedtime, formState.waketime)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatTime(formState.bedtime)} - {formatTime(formState.waketime)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleSubmit(e, time, selectedDate, { setShowMealInput, setShowExerciseInput, setShowSleepInput, setShowMeasurementsInput })}
                            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {formState.id == null ? 'Add Sleep Entry' : 'Save Changes'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowSleepInput(false);
                              setActiveForm('meal');
                            }}
                            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            {formState.id == null ? 'Cancel' : 'Cancel Edit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Measurements Form Fields */}
                  {settings.enableMeasurements && activeForm === 'measurements' && showMeasurementsInput && !isLoadingEdit && (
                    <div className="pt-6 px-4 pb-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {formState.id == null ? 'Add Body Measurements' : 'Edit Body Measurements'}
                        </h4>
                        <button
                          onClick={() => {
                            setShowMeasurementsInput(false);
                            setActiveForm('meal');
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Weight (Required) */}
                        <div>
                          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                            Weight <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id="weight"
                              type="number"
                              step="0.1"
                              min="0"
                              value={formState.weight}
                              onChange={(e) => setFormState(prev => ({ ...prev, weight: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                              placeholder="Enter your weight"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                              <span className="text-gray-500 text-sm">{settings.weightUnit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Body Measurements */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="neck" className="block text-sm font-medium text-gray-700 mb-2">
                              Neck
                            </label>
                            <div className="relative">
                              <input
                                id="neck"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.neck}
                                onChange={(e) => setFormState(prev => ({ ...prev, neck: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Neck measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="chest" className="block text-sm font-medium text-gray-700 mb-2">
                              Chest
                            </label>
                            <div className="relative">
                              <input
                                id="chest"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.chest}
                                onChange={(e) => setFormState(prev => ({ ...prev, chest: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Chest measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="arm" className="block text-sm font-medium text-gray-700 mb-2">
                              Arm
                            </label>
                            <div className="relative">
                              <input
                                id="arm"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.arm}
                                onChange={(e) => setFormState(prev => ({ ...prev, arm: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Arm measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="waist" className="block text-sm font-medium text-gray-700 mb-2">
                              Waist
                            </label>
                            <div className="relative">
                              <input
                                id="waist"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.waist}
                                onChange={(e) => setFormState(prev => ({ ...prev, waist: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Waist measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="thigh" className="block text-sm font-medium text-gray-700 mb-2">
                              Thigh
                            </label>
                            <div className="relative">
                              <input
                                id="thigh"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.thigh}
                                onChange={(e) => setFormState(prev => ({ ...prev, thigh: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Thigh measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="shoulders" className="block text-sm font-medium text-gray-700 mb-2">
                              Shoulders
                            </label>
                            <div className="relative">
                              <input
                                id="shoulders"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.shoulders}
                                onChange={(e) => setFormState(prev => ({ ...prev, shoulders: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Shoulders measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="calf" className="block text-sm font-medium text-gray-700 mb-2">
                              Calf
                            </label>
                            <div className="relative">
                              <input
                                id="calf"
                                type="number"
                                step="0.1"
                                min="0"
                                value={formState.calf}
                                onChange={(e) => setFormState(prev => ({ ...prev, calf: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 pr-16"
                                placeholder="Calf measurement"
                              />
                              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">{settings.lengthUnit}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                          </label>
                          <textarea
                            id="notes"
                            value={formState.notes}
                            onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                            placeholder="Add any additional notes about your measurements..."
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleSubmit(e, time, selectedDate, { setShowMealInput, setShowExerciseInput, setShowSleepInput, setShowMeasurementsInput })}
                            className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {formState.id == null ? 'Add Measurements' : 'Save Changes'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowMeasurementsInput(false);
                              setActiveForm('meal');
                            }}
                            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            {formState.id == null ? 'Cancel' : 'Cancel Edit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}


                  {formError && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {formError}
                    </div>
                  )}

                  {formSuccessMessage && (
                    <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      {formSuccessMessage}
                    </div>
                  )}

                  {librarySuccessMessage && (
                    <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {librarySuccessMessage}
                    </div>
                  )}
                </form>
              </div>

              {/* View All Entries Button */}
              <div className="mt-6 flex justify-center">
                <a
                  href={`/entries?date=${selectedDate ? (() => {
                    // Format date using local timezone to avoid timezone issues
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })() : (() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View All Entries ({currentDateEntries.length})
                </a>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Information Modal */}
      {showInfoModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ overflow: 'hidden' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleInfoCancel} />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Information - {selectedEntry.name}
                </h3>
                <button
                  onClick={handleInfoCancel}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={infoFormData.notes}
                  onChange={(e) => setInfoFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any additional notes about this entry..."
                />
              </div>


              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleInfoSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Information
                </button>
                <button
                  onClick={handleInfoCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
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
                            checked={settings.weightUnit === 'lbs'}
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
                            checked={settings.weightUnit === 'kg'}
                            onChange={(e) => updateSetting('weightUnit', e.target.value)}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-xs">Kilograms (kg)</span>
                        </label>
                      </div>

                      {/* Desktop: Select dropdown */}
                      <select
                        id="weightUnit"
                        value={settings.weightUnit}
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
                            checked={settings.lengthUnit === 'in'}
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
                            checked={settings.lengthUnit === 'cm'}
                            onChange={(e) => updateSetting('lengthUnit', e.target.value)}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-xs">Centimeters (cm)</span>
                        </label>
                      </div>

                      {/* Desktop: Select dropdown */}
                      <select
                        id="lengthUnit"
                        value={settings.lengthUnit}
                        onChange={(e) => updateSetting('lengthUnit', e.target.value)}
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
                            checked={settings.dateFormat === 'MM/DD/YYYY'}
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
                            checked={settings.dateFormat === 'DD/MM/YYYY'}
                            onChange={(e) => updateSetting('dateFormat', e.target.value)}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-xs">DD/MM/YYYY</span>
                        </label>
                      </div>

                      {/* Desktop: Select dropdown */}
                      <select
                        id="dateFormat"
                        value={settings.dateFormat}
                        onChange={(e) => updateSetting('dateFormat', e.target.value)}
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
                            checked={settings.timeFormat === '12h'}
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
                            checked={settings.timeFormat === '24h'}
                            onChange={(e) => updateSetting('timeFormat', e.target.value)}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-xs">24h</span>
                        </label>
                      </div>

                      {/* Desktop: Select dropdown */}
                      <select
                        id="timeFormat"
                        value={settings.timeFormat}
                        onChange={(e) => updateSetting('timeFormat', e.target.value)}
                        className="hidden sm:block mt-1 w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
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
const DateTimeSelectorWithProvider = () => {
  return (
    <SettingsProvider>
      <DateTimeSelector />
    </SettingsProvider>
  );
};

export default DateTimeSelectorWithProvider;