import { useMemo, useState, useEffect, useRef } from 'react';
import Calendar from './Calendar';

import AutocompleteInput from './AutocompleteInput';
import TimePicker from './TimePicker';
import ExerciseForm from './ExerciseForm.jsx';

import healthDB from '../lib/database.js';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext.jsx';
import { formatDate, formatTime } from '../lib/utils';
import { getCurrentTimeParts, calculateSleepDuration, formatDateLocalYYYYMMDD } from '../lib/dateUtils';

import { useHealthData } from '../hooks/useHealthData';
import { useLibraryPlaceholders } from '../hooks/useLibraryPlaceholders.js';
import { useFormState } from '../hooks/useFormState';
import { usePhotoManagement } from '../hooks/usePhotoManagement';



const DateTimeSelector = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [time, setTime] = useState(() => getCurrentTimeParts());
  // Initialize showModal to true if we have edit/info params in URL
  const [showModal, setShowModal] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return !!(urlParams.get('edit') || urlParams.get('info'));
    }
    return false;
  });
  const [isClient, setIsClient] = useState(false);

  // Get settings from context
  const { settings, updateSetting } = useSettings();

  // Entries state managed by useHealthData hook
  const { entries, isDBInitialized, addEntry, updateEntry } = useHealthData();
  const mealLibPh = useLibraryPlaceholders({ enabled: isDBInitialized });



  // Library state


  // Form visibility state
  const [showMealInput, setShowMealInput] = useState(false);
  const [showActivityInput, setShowActivityInput] = useState(false);
  const [showSleepInput, setShowSleepInput] = useState(false);
  const [showMeasurementsInput, setShowMeasurementsInput] = useState(false);
  const setShowExerciseInput = (v) => { if (typeof v === 'function') setShowActivityInput(v()); else setShowActivityInput(!!v); };

  // Other state

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [infoFormData, setInfoFormData] = useState({ notes: '' });


  const [showSettings, setShowSettings] = useState(false);
  const processedUrlParams = useRef(new Set());
  const modalOpenedViaEdit = useRef(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  /** Skip the first persist: the save effect runs before the load-from-LS effect's setState applies, which would otherwise wipe healthFormState with an empty form (noticeable after tab switch / AI / remount). */
  const skipInitialFormStatePersistRef = useRef(true);

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
          fats: entry.fats || '',
          fibre: entry.fibre || '',
          other: entry.other || ''
        };

        const existingFoods = await healthDB.getFoodItems(entry.name, 100);
        const isDuplicate = existingFoods.some(food =>
          food.name.toLowerCase() === entry.name.toLowerCase() &&
          food.calories === foodData.calories &&
          food.protein === foodData.protein
        );

        if (!isDuplicate) {
          await healthDB.addFoodItem(foodData);
          console.log('Food added to database library:', entry.name);
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
    setFormSuccessMessage,
    activeForm,
    setActiveForm,
    handleSubmit
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

    // Settings are now loaded from SettingsContext automatically
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (showModal && formState.id == null) {
      setTime(getCurrentTimeParts());
    }
  }, [showModal, formState.id]);

  // Open modal when navigating with date and add parameter (?date=xxx&add=true)
  useEffect(() => {
    if (typeof window === 'undefined' || !isDBInitialized || showModal) return;

    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const addParam = urlParams.get('add');

    if (addParam !== 'true') return;

    // Set date from URL if we have it (so selectedDate is set before or when we open modal)
    if (dateParam) {
      try {
        const [year, month, day] = dateParam.split('-').map(Number);
        const urlDate = new Date(year, month - 1, day);
        if (!isNaN(urlDate.getTime())) {
          setSelectedDate(new Date(urlDate.getFullYear(), urlDate.getMonth(), urlDate.getDate()));
        }
      } catch (_) {}
    } else {
      setSelectedDate((prev) => prev || new Date());
    }

    // Open the Add a New Entry modal
    const frameId = requestAnimationFrame(() => {
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get('add') === 'true') setShowModal(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isDBInitialized, showModal]);

  // Ensure measurements are always enabled (using context)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!settings.enableMeasurements) {
      updateSetting('enableMeasurements', true);
    }
  }, [settings.enableMeasurements, updateSetting]);

  // Initialize database and load data on component mount
  // Database initialization and data loading handled by useHealthData hook

  // Load frequent items when database is initialized
  useEffect(() => {
    if (isDBInitialized) {

    }
  }, [isDBInitialized]);

  // Entries saving handled by useHealthData hook


  // Save form state to localStorage whenever it changes (not on the first run — see skipInitialFormStatePersistRef)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipInitialFormStatePersistRef.current) {
      skipInitialFormStatePersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem('healthFormState', JSON.stringify(formState));
    } catch (error) {
      console.error('Error saving form state to localStorage:', error);
    }
  }, [formState]);

  // updateSetting is now from SettingsContext, no need for local function




  const headerText = useMemo(() => {
    // Return empty string - date will be shown in the form area instead
    return '';
  }, []);

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

  const todaySleepDuration = useMemo(() => {
    const sleepEntry = todayEntries.find(e => e.type === 'sleep');
    return sleepEntry ? sleepEntry.duration : null;
  }, [todayEntries]);

  // Calculate today's total calories and get calorie goal
  const calorieGoalData = useMemo(() => {
    if (!isClient || typeof window === 'undefined') {
      return { goalValue: null, todayCalories: 0, goalType: null, goalLabel: null };
    }

    // Get selected calorie goal from settings
    const selectedGoal = settings?.calorieGoal || 'none';

    if (selectedGoal === 'none') {
      return { goalValue: null, todayCalories: 0, goalType: null, goalLabel: null };
    }

    // Load calorie calculator data from localStorage
    let calculatorData = null;
    try {
      const savedData = localStorage.getItem('calorieCalculatorData');
      if (savedData) {
        calculatorData = JSON.parse(savedData);
      }
    } catch (e) {
      console.error('Error loading calculator data:', e);
    }

    if (!calculatorData) {
      return { goalValue: null, todayCalories: 0, goalType: null, goalLabel: null };
    }

    // Get goal value based on selected goal type
    const goalValue = calculatorData[selectedGoal] || null;

    // Calculate today's total calories from meal entries
    const todayCalories = todayEntries
      .filter(e => e.type === 'meal' && e.calories)
      .reduce((sum, entry) => {
        const calories = parseFloat(entry.calories) || 0;
        return sum + calories;
      }, 0);

    // Get goal type label
    const goalLabels = {
      weightLoss: 'Weight Loss',
      maintenance: 'Maintenance',
      weightGain: 'Weight Gain'
    };

    return {
      goalValue,
      todayCalories: Math.round(todayCalories),
      goalType: selectedGoal,
      goalLabel: goalLabels[selectedGoal] || selectedGoal
    };
  }, [isClient, settings?.calorieGoal, todayEntries]);



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

    setShowSleepInput(false);
    setShowMeasurementsInput(false);
    setShowModal(true);
  }

  const handleExerciseFormSave = async (exercises, editId) => {
    if (!selectedDate) return;
    const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    if (isNaN(normalizedDate.getTime())) return;

    const buildExerciseEntry = (e, id) => {
      const sets = [];

      // Primary set from main fields
      sets.push({
        reps: e.reps || '',
        load: e.load || ''
      });

      // Additional sets from extraSets array, if present
      if (Array.isArray(e.extraSets)) {
        e.extraSets.forEach(s => {
          if (!s) return;
          const reps = s.reps || '';
          const load = s.load || s.loadKg || '';
          if (!reps && !load) return;
          sets.push({ reps, load });
        });
      }

      return {
        id,
        name: String(e.name).trim(),
        type: 'exercise',
        date: normalizedDate,
        time: { ...time },
        sets,
        notes: (e.notes && String(e.notes).trim()) || ''
      };
    };

    setFormError('');
    try {
      if (editId != null && exercises.length > 0) {
        const entry = buildExerciseEntry(exercises[0], editId);
        await updateEntry(entry);
        for (let i = 1; i < exercises.length; i++) {
          const ex = exercises[i];
          if (!ex.name || !String(ex.name).trim()) continue;
          await addEntry(buildExerciseEntry(ex, Date.now() + i));
        }
      } else {
        for (let i = 0; i < exercises.length; i++) {
          const e = exercises[i];
          if (!e.name || !String(e.name).trim()) continue;
          await addEntry(buildExerciseEntry(e, Date.now() + i));
        }
      }
      setShowActivityInput(false);
      setFormSuccessMessage(`Saved ${exercises.filter(e => e.name && String(e.name).trim()).length} exercise(s) to calendar.`);
      setTimeout(() => setFormSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save exercise entries:', err);
      setFormError('Failed to save to calendar. Please try again.');
    }
  };

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
    modalOpenedViaEdit.current = false; // Reset the flag when modal is closed

    // Reset form inputs so next open shows the 4 buttons (Meal, Exercise, Sleep, Measure)
    setShowMealInput(false);
    setShowActivityInput(false);
    setShowSleepInput(false);
    setShowMeasurementsInput(false);
  }



  // Functions to handle individual sets




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
      // But ensure modal stays open if it was opened via these params
      if ((editParam || infoParam) && !showModal) {
        setShowModal(true);
      }
      return;
    }

    console.log('URL params check:', { dateParam, editParam, infoParam, entriesCount: Object.keys(entries).length });

    // Skip if no action params
    if (!editParam && !infoParam) {
      console.log('No edit/info params, skipping');
      // If modal is open but no params, don't close it (user might have closed URL manually)
      // Only return, don't interfere with existing modal state
      return;
    }

    // Clear any existing form state to prevent showing old data
    if (editParam) {
      // Set loading flag to prevent form from showing old data
      setIsLoadingEdit(true);
      // Reset form state and close any open forms immediately
      setShowMealInput(false);

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

    // If we have edit/info params but entries aren't loaded yet, show loading state
    if ((editParam || infoParam) && Object.keys(entries).length === 0) {
      console.log('Waiting for entries to load...');
      setIsLoadingEdit(true);
      setShowModal(true); // Show modal with loading state
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

        // Activity/exercise edit inline (no dedicated page)
        if (foundEntry.type === 'activity' || foundEntry.type === 'exercise') {
          setShowMealInput(false);
          setShowSleepInput(false);
          setShowMeasurementsInput(false);
          if (foundEntry.time) setTime(foundEntry.time);
          if (foundEntry.date) {
            const entryDate = foundEntry.date instanceof Date ? foundEntry.date : new Date(foundEntry.date);
            setSelectedDate(new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()));
          }
          const sets = (foundEntry.sets && foundEntry.sets.length > 0) ? foundEntry.sets : [{ reps: '', load: '' }];
          setFormState({
            id: foundEntry.id,
            name: foundEntry.name || '',
            type: 'exercise',
            sets,
            notes: foundEntry.notes || '',
            durationMinutes: foundEntry.durationMinutes != null ? String(foundEntry.durationMinutes) : '',
            photo: foundEntry.photo || null
          });
          setActiveForm('exercise');
          setShowActivityInput(true);
          setShowModal(true);
          modalOpenedViaEdit.current = true;
          // Clear loading flag now that exercise form is ready
          setIsLoadingEdit(false);
          // Optionally clean up URL 'edit' param while keeping modal open
          if (typeof window !== 'undefined') {
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('edit');
            window.history.replaceState({}, '', newUrl);
          }
          processedUrlParams.current.add(urlKey);
          return;
        }

        // Meal edit on dedicated page (same as Activity)
        if (foundEntry.type === 'meal') {
          const d = foundEntry.date instanceof Date ? foundEntry.date : new Date(foundEntry.date);
          const dateStr = isNaN(d.getTime()) ? formatDateLocalYYYYMMDD(new Date()) : formatDateLocalYYYYMMDD(d);
          window.location.href = `/add-meal?edit=${foundEntry.id}&date=${dateStr}`;
          return;
        }

        // Call handleEdit immediately without setTimeout - set form state directly
        // Close any open forms first
        setShowMealInput(false);

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
          // Convert measurement values to strings for input fields
          weight: foundEntry.weight ? String(foundEntry.weight) : '',
          neck: foundEntry.neck ? String(foundEntry.neck) : '',
          shoulders: foundEntry.shoulders ? String(foundEntry.shoulders) : '',
          chest: foundEntry.chest ? String(foundEntry.chest) : '',
          waist: foundEntry.waist ? String(foundEntry.waist) : '',
          hips: foundEntry.hips ? String(foundEntry.hips) : '',
          thigh: foundEntry.thigh ? String(foundEntry.thigh) : '',
          arm: foundEntry.arm ? String(foundEntry.arm) : '',
          calf: foundEntry.calf ? String(foundEntry.calf) : '',
          chestSkinfold: foundEntry.chestSkinfold ? String(foundEntry.chestSkinfold) : '',
          abdominalSkinfold: foundEntry.abdominalSkinfold ? String(foundEntry.abdominalSkinfold) : '',
          thighSkinfold: foundEntry.thighSkinfold ? String(foundEntry.thighSkinfold) : '',
          tricepSkinfold: foundEntry.tricepSkinfold ? String(foundEntry.tricepSkinfold) : '',
          subscapularSkinfold: foundEntry.subscapularSkinfold ? String(foundEntry.subscapularSkinfold) : '',
          suprailiacSkinfold: foundEntry.suprailiacSkinfold ? String(foundEntry.suprailiacSkinfold) : '',
          notes: foundEntry.notes || '',
          photo: foundEntry.photo || null
        });

        setActiveForm(foundEntry.type);
        setShowModal(true);
        modalOpenedViaEdit.current = true; // Track that modal was opened via edit

        // Show the appropriate form input
        if (foundEntry.type === 'meal') {
          setShowMealInput(true);

        } else if (foundEntry.type === 'sleep') {
          setShowSleepInput(true);
        } else if (foundEntry.type === 'measurements') {
          setShowMeasurementsInput(true);
        }

        // Clear loading flag now that form is ready
        setIsLoadingEdit(false);

        // Ensure modal stays open
        setShowModal(true);

        // Clean up URL - but keep modal open
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
        // Show modal with error message instead of blank page
        setShowModal(true);
        setIsLoadingEdit(false);
        // Mark as processed to prevent re-running
        processedUrlParams.current.add(urlKey);
        // Clean up URL even if entry not found
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('edit');
        window.history.replaceState({}, '', newUrl);
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






  // Note: Drag and drop reordering is temporarily disabled as it requires
  // additional implementation with the centralized data hook


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
  const editParam = urlParams?.get('edit');
  const infoParam = urlParams?.get('info');

  return (
    <div className="w-full">
      {!hasEditOrInfoParam && !showModal && (
        <div className="w-full min-h-[calc(100vh-160px)] bg-white dark:bg-[var(--color-bg-base)] flex items-start justify-center overflow-y-auto py-4 sm:py-6 pb-8" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <div className="max-w-sm mx-auto flex flex-col gap-4 sm:gap-6 px-3 sm:px-4 w-full shrink-0">
            {/* Calorie Goal Card */}
            {calorieGoalData.goalValue ? (
              <div className="bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border border-gray-100 dark:border-transparent p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Calorie Goal</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className={`text-center p-2 sm:p-3 rounded-xl ${calorieGoalData.todayCalories > calorieGoalData.goalValue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <div className={`text-xl sm:text-2xl font-bold ${calorieGoalData.todayCalories > calorieGoalData.goalValue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {calorieGoalData.todayCalories}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Today</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {calorieGoalData.goalValue > 0 && calorieGoalData.todayCalories > calorieGoalData.goalValue ? '+' : ''}
                      {calorieGoalData.goalValue > 0 && calorieGoalData.todayCalories < calorieGoalData.goalValue ? '-' : ''}
                      {calorieGoalData.goalValue}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Goal</div>
                  </div>
                  <div className={`text-center p-2 sm:p-3 rounded-xl ${calorieGoalData.todayCalories > calorieGoalData.goalValue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    <div className={`text-xl sm:text-2xl font-bold ${calorieGoalData.todayCalories > calorieGoalData.goalValue ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {Math.abs(calorieGoalData.todayCalories - calorieGoalData.goalValue)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
                      {calorieGoalData.todayCalories > calorieGoalData.goalValue ? 'Over' : 'Under'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (settings?.calorieGoal === 'none' || !settings?.calorieGoal) ? (
              <div className="bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border border-gray-100 dark:border-transparent p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Calorie Goal</h3>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Choose your goal in <a href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">My Settings</a></p>
                </div>
              </div>
            ) : null}

            {/* Calendar Card */}
            <div>
              {isClient && <Calendar selectedDate={selectedDate} onSelectDate={handleDateSelect} entries={entries} />}
            </div>

            {/* Today's Summary Card */}
            <div className="bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border border-gray-100 dark:border-transparent p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Today's Summary</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {todayEntries.filter(e => e.type === 'meal').length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Meals</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {todaySleepDuration || '—'}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Sleep</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {todayEntries.filter(e => e.type === 'measurements').length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">Measured</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showModal || hasEditOrInfoParam || modalOpenedViaEdit.current) && (
        <div className="fixed inset-0 z-50 w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-[var(--color-bg-base)] dark:via-[var(--color-bg-base)] dark:to-[var(--color-bg-base)] flex flex-col overflow-hidden" role="dialog" aria-modal="true" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
          {/* Content - Centered vertically between navbars */}
          <div className={`flex-1 overflow-y-auto min-h-0 py-8 ${!(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) ? 'flex items-center justify-center' : ''}`} style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center">
              {/* Loading State */}
              {isLoadingEdit && Object.keys(entries).length === 0 && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading entry...</p>
                  </div>
                </div>
              )}

              {/* Entry not found error - Show only if we've checked and entry wasn't found */}
              {!isLoadingEdit && hasEditOrInfoParam && editParam && !formState.id && Object.keys(entries).length > 0 && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center max-w-md">
                    <p className="text-red-600 dark:text-red-400 mb-4 text-lg font-semibold">Entry not found</p>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">The entry you're trying to edit could not be found.</p>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              )}

              {/* Entry Form - Show if not in error state, or show default form if modal is open */}
              {!(isLoadingEdit === false && hasEditOrInfoParam && editParam && !formState.id && Object.keys(entries).length > 0) && !(isLoadingEdit === true && Object.keys(entries).length === 0) && (
                <div className="w-full flex flex-col items-center">
                  {/* Date display above the card */}
                  {!(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) && selectedDate && (
                    <div className="w-full max-w-[380px] md:max-w-4xl mx-auto mb-4 text-center">
                      <div className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                        {formatDate(selectedDate)}
                      </div>
                    </div>
                  )}
                  <div className={`w-full ${(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) ? 'max-w-2xl mx-auto' : 'max-w-[380px] md:max-w-4xl mx-auto'} ${(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) ? '' : 'border border-gray-200/50 dark:border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl bg-white/95 dark:bg-[var(--color-bg-base)]/95 backdrop-blur-sm p-6 md:p-8 space-y-6 relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-50/50 before:via-transparent before:to-purple-50/50 dark:before:from-blue-900/10 dark:before:via-transparent dark:before:to-purple-900/10 before:pointer-events-none'}`}>
                    {!(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) && (
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                            {formState.id == null ? 'Add a New Entry' : `Edit ${activeForm === 'exercise' ? 'Exercise' : activeForm.charAt(0).toUpperCase() + activeForm.slice(1)} Entry`}
                          </h2>
                        </div>
                        <button
                          onClick={closeModal}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Close"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <form className={(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) ? 'w-full' : 'space-y-6'}>
                      {/* Desktop Layout: Single column when form is active, side by side otherwise */}
                      {!(showMealInput || showActivityInput || showSleepInput || showMeasurementsInput) && (
                        <div className="space-y-6 relative z-10">
                          {/* Section Header + Entry Type Buttons */}
                          <div>
                            <div className="mb-4">
                              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Select Entry Type</h3>
                              <p className="text-xs text-gray-400 dark:text-gray-500">Choose what you'd like to track</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                              {settings.enableMeals && (
                                <a
                                  href={selectedDate ? `/add-meal?date=${formatDateLocalYYYYMMDD(selectedDate)}` : '/add-meal'}
                                  className="group relative py-4 md:py-5 rounded-2xl font-semibold shadow-lg active:scale-[0.96] transition-all duration-300 text-sm md:text-base overflow-hidden bg-white dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-900/20 dark:hover:to-gray-800/20 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl hover:-translate-y-0.5 flex flex-col items-center justify-center min-h-[4rem] no-underline"
                                >
                                  <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-2xl md:text-3xl">🍽️</span>
                                    <span>Meal</span>
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-br from-gray-500/0 to-gray-500/0 group-hover:from-gray-500/10 group-hover:to-gray-500/5 transition-all duration-300 rounded-2xl pointer-events-none" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveForm('exercise');
                                  const base = { id: null, name: '', type: 'exercise', notes: '', durationMinutes: '', photo: null };
                                  const sets = (formState.sets && formState.sets.length > 0) ? formState.sets : [{ reps: '', load: '' }];
                                  setFormState((prev) => ({ ...prev, ...base, sets }));
                                  setShowActivityInput(true);
                                  setShowModal(true);
                                }}
                                className={`group relative py-4 md:py-5 rounded-2xl font-semibold shadow-lg active:scale-[0.96] transition-all duration-300 text-sm md:text-base overflow-hidden ${showActivityInput ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/50' : 'bg-white dark:bg-gray-800/80 border-2 border-orange-200 dark:border-orange-700/50 text-orange-700 dark:text-orange-300 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-900/20 dark:hover:to-orange-800/20 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-0.5'}`}
                              >
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                  <span className="text-2xl md:text-3xl">🏃</span>
                                  <span>Exercise</span>
                                </div>
                                {!showActivityInput && <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/10 group-hover:to-orange-500/5 transition-all duration-300 rounded-2xl" />}
                              </button>
                              {settings.enableSleep !== false && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dateStr = selectedDate ? formatDateLocalYYYYMMDD(selectedDate) : formatDateLocalYYYYMMDD(new Date());
                                    window.location.href = `/add-sleep?date=${dateStr}`;
                                  }}
                                  className={`group relative py-4 md:py-5 rounded-2xl font-semibold shadow-lg active:scale-[0.96] transition-all duration-300 text-sm md:text-base overflow-hidden ${showSleepInput
                                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl shadow-purple-500/50'
                                    : 'bg-white dark:bg-gray-800/80 border-2 border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-0.5'
                                    }`}
                                >
                                  <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-2xl md:text-3xl">🛌</span>
                                    <span>Sleep</span>
                                  </div>
                                  {!showSleepInput && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-purple-500/5 transition-all duration-300 rounded-2xl" />
                                  )}
                                </button>
                              )}
                              {settings.enableMeasurements && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dateStr = selectedDate ? formatDateLocalYYYYMMDD(selectedDate) : formatDateLocalYYYYMMDD(new Date());
                                    window.location.assign(`/add-measurement?date=${dateStr}`);
                                  }}
                                  className="group relative py-4 md:py-5 rounded-2xl font-semibold shadow-lg active:scale-[0.96] transition-all duration-300 text-sm md:text-base overflow-hidden bg-white dark:bg-gray-800/80 border-2 border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/20 dark:hover:to-green-800/20 hover:border-green-400 dark:hover:border-green-500 hover:shadow-xl hover:shadow-green-500/20 hover:-translate-y-0.5 flex flex-col items-center justify-center min-h-[4rem] w-full"
                                >
                                  <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-2xl md:text-3xl">📏</span>
                                    <span>Measure</span>
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:to-green-500/5 transition-all duration-300 rounded-2xl pointer-events-none" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Attach Photo - below entry type buttons */}
                          {activeForm !== 'sleep' && activeForm !== 'measurements' && activeForm !== 'exercise' && (
                            <div className="relative z-10 border-2 border-dashed border-gray-300/60 dark:border-gray-600/60 rounded-2xl p-5 md:p-6 space-y-4 bg-gradient-to-br from-gray-50/80 via-blue-50/50 to-purple-50/30 dark:from-gray-800/50 dark:via-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-300 group">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200">
                                      Attach Photo
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Optional</p>
                                  </div>
                                </div>
                                {formState.photo && (
                                  <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={triggerCameraCapture}
                                  className="flex-1 border-2 border-blue-400 dark:border-blue-600 py-3 md:py-4 rounded-xl font-semibold text-blue-700 dark:text-blue-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm active:scale-[0.97] transition-all hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 text-sm md:text-base"
                                >
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="text-lg">📷</span>
                                    <span>Take Photo</span>
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={triggerPhotoUpload}
                                  className="flex-1 border-2 border-blue-400 dark:border-blue-600 py-3 md:py-4 rounded-xl font-semibold text-blue-700 dark:text-blue-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm active:scale-[0.97] transition-all hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 text-sm md:text-base"
                                >
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="text-lg">⬆️</span>
                                    <span>Upload</span>
                                  </span>
                                </button>
                              </div>
                              {formState.photo && (
                                <div className="mt-4 space-y-3">
                                  <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg group">
                                    <img
                                      src={formState.photo.dataUrl}
                                      alt="Entry attachment preview"
                                      className="w-full max-h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  </div>
                                  <div className="flex items-center justify-between px-2">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                      {formState.photo.name ? `${formState.photo.name} • ` : ''}
                                      {new Date(formState.photo.capturedAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSavePhotoToGallery(selectedDate, time, activeForm, addEntry)}
                                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-green-400 dark:border-green-600 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 text-green-700 dark:text-green-300 font-semibold hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/50 dark:hover:to-green-800/50 hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm"
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
                        <div className="pt-6 px-4 pb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Add Meal</h4>
                              {selectedDate && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Date: {selectedDate.toLocaleDateString()}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setShowMealInput(false);
                                setActiveForm('meal');
                              }}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="space-y-4">
                            {/* Time Picker */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Time
                              </label>
                              <TimePicker
                                value={time}
                                onChange={(newTime) => setTime(newTime)}
                              />
                            </div>

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
                                    placeholder={mealLibPh.mealNamePlaceholder}
                                    autoFocus
                                    id="meal-name"
                                    className="dark:border-gray-600 dark:bg-[var(--color-bg-subtle)] dark:text-white dark:placeholder-gray-400"
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
                                list="meal-amount-datalist"
                                autoComplete="off"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                placeholder={mealLibPh.mealAmountPlaceholder}
                                value={formState.amount}
                                onChange={(e) => setFormState((s) => ({ ...s, amount: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                              />
                              <datalist id="meal-amount-datalist">
                                {mealLibPh.mealAmountOptions.map((a) => (
                                  <option key={a} value={a} />
                                ))}
                              </datalist>
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
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder={mealLibPh.mealCaloriesPlaceholder}
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
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder={mealLibPh.mealProteinPlaceholder}
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
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder={mealLibPh.mealCarbsPlaceholder}
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
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder={mealLibPh.mealFatsPlaceholder}
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
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder={mealLibPh.mealFibrePlaceholder}
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
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder={mealLibPh.mealOtherPlaceholder}
                                  value={formState.other}
                                  onChange={(e) => setFormState((s) => ({ ...s, other: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pb-4">
                              <button
                                type="button"
                                onClick={(e) => handleSubmit(e, time, selectedDate, { setShowMealInput, setShowExerciseInput: setShowActivityInput, setShowSleepInput, setShowMeasurementsInput })}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95"
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
                                className="inline-flex items-center px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95"
                              >
                                {formState.id == null ? 'Cancel' : 'Cancel Edit'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Exercise Form (from ExerciseForm.jsx) */}
                      {activeForm === 'exercise' && showActivityInput && !isLoadingEdit && (
                        <div className="pt-2 pb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Exercise</h4>
                            </div>
                            <button type="button" onClick={() => setShowActivityInput(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          {selectedDate && (
                            <div className="mb-3">
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>Date</span>
                                </p>
                                <p className="text-base text-gray-900 dark:text-white font-medium">
                                  {selectedDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )}
                          <section className="space-y-4 mb-4" aria-label="Time">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Time
                              </label>
                              <TimePicker value={time} onChange={(newTime) => setTime(newTime)} />
                            </div>
                          </section>
                          <ExerciseForm
                            key={formState.id ?? 'new'}
                            embedded
                            selectedDate={selectedDate}
                            time={time}
                            onSave={handleExerciseFormSave}
                            onCancel={() => setShowActivityInput(false)}
                            initialExercises={formState.id != null ? [{
                              name: formState.name || '',
                              // Total sets count comes from number of set objects
                              sets: Array.isArray(formState.sets) && formState.sets.length > 0 ? String(formState.sets.length) : '',
                              // First set values populate the primary row
                              reps: formState.sets?.[0] ? String(formState.sets[0].reps ?? '') : '',
                              load: formState.sets?.[0] ? String(formState.sets[0].load ?? '') : '',
                              // Remaining set objects become extraSets for additional rows
                              extraSets: Array.isArray(formState.sets) && formState.sets.length > 1
                                ? formState.sets.slice(1).map(s => ({
                                    sets: '',
                                    reps: String(s.reps ?? ''),
                                    load: String(s.load ?? '')
                                  }))
                                : [],
                              notes: formState.notes || ''
                            }] : undefined}
                            editId={formState.id != null ? formState.id : undefined}
                          />
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
                    </form>
                  </div>
                </div>
              )}

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
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                  Save Information
                </button>
                <button
                  onClick={handleInfoCancel}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
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