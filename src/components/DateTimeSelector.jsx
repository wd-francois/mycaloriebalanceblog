import React, { useMemo, useState, useEffect } from 'react';
import Calendar from '@react/Calendar.jsx';
import TimePicker from '@react/TimePicker.jsx';
import AutocompleteInput from './AutocompleteInput.jsx';
import GroupedEntries from './GroupedEntries.jsx';
import MeasurementsForm from './MeasurementsForm.jsx';
import healthDB from '../lib/database.js';
import { useSettings } from '../contexts/SettingsContext.jsx';

// Quick Add Manager Content Component
const QuickAddManagerContent = ({ type, frequentItems, onToggleItem }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const items = type === 'food' ? 
          await healthDB.getFoodItems() : 
          await healthDB.getExerciseItems();
        setAllItems(items);
      } catch (error) {
        console.error('Error loading items:', error);
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allItems.map((item) => {
        const isSelected = frequentItems[type].some(frequentItem => frequentItem.id === item.id);
        return (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isSelected 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 truncate">{item.description}</p>
              )}
            </div>
            <button
              onClick={() => onToggleItem(item, type)}
              className={`ml-3 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

function formatDate(date) {
  return date?.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTime({ hour, minute, period }) {
  const mm = minute.toString().padStart(2, '0');
  return `${hour}:${mm} ${period}`;
}

function calculateSleepDuration(bedtime, waketime) {
  // Convert to 24-hour format for calculation
  const bedHour24 = bedtime.period === 'AM' ? (bedtime.hour === 12 ? 0 : bedtime.hour) : (bedtime.hour === 12 ? 12 : bedtime.hour + 12);
  const wakeHour24 = waketime.period === 'AM' ? (waketime.hour === 12 ? 0 : waketime.hour) : (waketime.hour === 12 ? 12 : waketime.hour + 12);
  
  const bedMinutes = bedHour24 * 60 + bedtime.minute;
  const wakeMinutes = wakeHour24 * 60 + waketime.minute;
  
  // Handle overnight sleep (bedtime PM, waketime AM)
  let totalMinutes;
  if (bedtime.period === 'PM' && waketime.period === 'AM') {
    totalMinutes = (24 * 60 - bedMinutes) + wakeMinutes;
  } else {
    totalMinutes = wakeMinutes - bedMinutes;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

const DateTimeSelector = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [time, setTime] = useState({ hour: 12, minute: 0, period: 'PM' });
  const [showModal, setShowModal] = useState(false);

  // Entries state - store entries per date (meals, exercises, sleep)
  const [entries, setEntries] = useState({});
  const [formState, setFormState] = useState({ id: null, name: '', type: 'meal', sets: [], amount: '', calories: '', protein: '', carbs: '', fats: '', bedtime: { hour: 10, minute: 0, period: 'PM' }, waketime: { hour: 6, minute: 0, period: 'AM' }, weight: '', neck: '', shoulders: '', chest: '', waist: '', hips: '', thigh: '', arm: '', chestSkinfold: '', abdominalSkinfold: '', thighSkinfold: '', tricepSkinfold: '', subscapularSkinfold: '', suprailiacSkinfold: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [activeForm, setActiveForm] = useState('meal'); // 'meal', 'exercise', 'sleep'
  const [showMealInput, setShowMealInput] = useState(false);
  const [showExerciseInput, setShowExerciseInput] = useState(false);
  const [showSleepInput, setShowSleepInput] = useState(false);
  const [showMeasurementsInput, setShowMeasurementsInput] = useState(false);
  const [isDBInitialized, setIsDBInitialized] = useState(false);
  const [frequentItems, setFrequentItems] = useState({ food: [], exercise: [] });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [infoFormData, setInfoFormData] = useState({ notes: '' });
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [collapsedTimes, setCollapsedTimes] = useState(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [showQuickAddSubmenu, setShowQuickAddSubmenu] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showQuickAddManager, setShowQuickAddManager] = useState(false);
  const [quickAddType, setQuickAddType] = useState('food');
  const [showSettings, setShowSettings] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [settings, setSettings] = useState({
    weightUnit: 'kg',
    lengthUnit: 'cm',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    // Feature toggles
    enableMeasurements: true,
    enableExercise: true,
    enableSleep: true,
    // Quick add toggles
    enableQuickAddFood: true,
    enableQuickAddExercise: true,
    enableMeals: true
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.menu-container')) {
        setShowMenu(false);
        setShowExportSubmenu(false);
        setShowQuickAddSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Local storage functions
  const saveToLocalStorage = (data) => {
    try {
      localStorage.setItem('healthEntries', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      // Try new key first, then fallback to old key for migration
      let saved = localStorage.getItem('healthEntries');
      if (!saved) {
        saved = localStorage.getItem('mealEntries');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const converted = {};
        Object.keys(parsed).forEach(dateKey => {
          converted[dateKey] = parsed[dateKey].map(entry => ({
            ...entry,
            date: new Date(entry.date),
            type: entry.type || 'meal' // Default to meal for backward compatibility
          }));
        });
        return converted;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return {};
  };

  // Initialize database and load data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize IndexedDB
        await healthDB.init();
        setIsDBInitialized(true);
        
        // Migrate data from localStorage if needed
        await healthDB.migrateFromLocalStorage();
        
        // Initialize with sample data if empty
        await healthDB.initializeSampleData();
        
        // Load frequent items
        await loadFrequentItems();
        
        // Load existing data from localStorage as fallback
        const savedEntries = loadFromLocalStorage();
        setEntries(savedEntries);
      } catch (error) {
        console.error('Error initializing database:', error);
        // Fallback to localStorage only
        const savedEntries = loadFromLocalStorage();
        setEntries(savedEntries);
      }
    };
    
    initializeApp();
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    saveToLocalStorage(entries);
  }, [entries]);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('healthTrackerSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          weightUnit: parsed.weightUnit || 'lbs',
          lengthUnit: parsed.lengthUnit || 'in',
          dateFormat: parsed.dateFormat || 'MM/DD/YYYY',
          timeFormat: parsed.timeFormat || '12h',
          enableMeasurements: parsed.enableMeasurements !== undefined ? parsed.enableMeasurements : true,
          enableExercise: parsed.enableExercise !== undefined ? parsed.enableExercise : true,
          enableSleep: parsed.enableSleep !== undefined ? parsed.enableSleep : true,
          enableMeals: parsed.enableMeals !== undefined ? parsed.enableMeals : true
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Export data functions
  const exportToJSON = () => {
    try {
      // Create a more readable export format
      const exportData = {
        exportDate: new Date().toISOString(),
        totalDates: Object.keys(entries).length,
        totalEntries: Object.values(entries).reduce((sum, dateEntries) => sum + dateEntries.length, 0),
        entries: entries
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `health-entries-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      alert('Failed to export to JSON. Please try again.');
    }
  };

  const exportToCSV = () => {
    try {
      // Create CSV header
      let csvContent = 'Date,Time,Type,Name,Amount,Sets,Reps,Load,Duration,Notes\n';
      
      // Add each entry
      Object.keys(entries).forEach(dateKey => {
        entries[dateKey].forEach(entry => {
          const date = new Date(entry.date);
          const formattedDate = date.toLocaleDateString();
          const formattedTime = formatTime(entry.time);
          const name = entry.name.replace(/"/g, '""'); // Escape quotes for CSV
          const amount = entry.amount || '';
          const sets = entry.sets || '';
          const reps = entry.reps || '';
          const load = entry.load || '';
          const duration = entry.duration || '';
          const notes = (entry.notes || '').replace(/"/g, '""'); // Escape quotes for CSV
          
          csvContent += `"${formattedDate}","${formattedTime}","${entry.type}","${name}","${amount}","${sets}","${reps}","${load}","${duration}","${notes}"\n`;
        });
      });
      
      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `health-entries-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export to CSV. Please try again.');
    }
  };

    const exportToPDF = async () => {
    try {
      // Create PDF content using jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Health Entries Report', 20, 20);
      
      // Add export info
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
      doc.text(`Total Dates: ${Object.keys(entries).length}`, 20, 45);
      doc.text(`Total Entries: ${Object.values(entries).reduce((sum, dateEntries) => sum + dateEntries.length, 0)}`, 20, 55);
      
      // Add entries
      let yPosition = 75;
      doc.setFontSize(14);
      doc.text('Health Entries:', 20, yPosition);
      yPosition += 10;
      
      Object.keys(entries).forEach(dateKey => {
        const date = new Date(entries[dateKey][0].date);
        const formattedDate = date.toLocaleDateString();
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(formattedDate, 20, yPosition);
        yPosition += 8;
        
        doc.setFont(undefined, 'normal');
        entries[dateKey].forEach(entry => {
          const formattedTime = formatTime(entry.time);
          let entryText = `${formattedTime} - ${entry.type.toUpperCase()}: ${entry.name}`;
          if (entry.amount) entryText += ` (${entry.amount})`;
          if (entry.sets) entryText += ` - ${entry.sets} sets`;
          if (entry.reps) entryText += ` x ${entry.reps} reps`;
          if (entry.load) entryText += ` @ ${entry.load}`;
          if (entry.duration) entryText += ` (${entry.duration})`;
          if (entry.notes) entryText += ` - Notes: ${entry.notes}`;
          
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(entryText, 30, yPosition);
          yPosition += 6;
        });
        
        yPosition += 5;
      });
      
      // Save the PDF
      doc.save(`health-entries-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again. Please ensure jsPDF is installed.');
    }
  };

  const headerText = useMemo(() => {
    return formatDate(selectedDate);
  }, [selectedDate]);

  // Get entries for the current selected date
  const currentDateEntries = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return entries[dateKey] || [];
  }, [entries, selectedDate]);

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

  function handleDateSelect(date) {
    setSelectedDate(date);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function resetForm() {
    setFormState({ id: null, name: '', type: activeForm, sets: [], amount: '', calories: '', protein: '', carbs: '', fats: '', bedtime: { hour: 10, minute: 0, period: 'PM' }, waketime: { hour: 6, minute: 0, period: 'AM' }, weight: '', neck: '', shoulders: '', chest: '', waist: '', hips: '', thigh: '', arm: '', chestSkinfold: '', abdominalSkinfold: '', thighSkinfold: '', tricepSkinfold: '', subscapularSkinfold: '', suprailiacSkinfold: '', notes: '' });
    setFormError('');
    // Don't close input forms - let user continue adding entries
  }

  function handleSubmit(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    handleSubmitWithData(formState);
  }

  function handleSubmitWithData(data) {
    setFormError('');

    const name = activeForm === 'measurements' ? 'Body Measurements' : data.name.trim();

    // Add validation back for exercise and meal entries (not sleep or measurements)
    if (!name && activeForm !== 'sleep' && activeForm !== 'measurements') {
      setFormError(`${activeForm.charAt(0).toUpperCase() + activeForm.slice(1)} name is required.`);
      return;
    }

    // Validate measurements
    if (activeForm === 'measurements') {
      if (!data.weight || !data.weight.toString().trim()) {
        setFormError('Weight is required for measurements.');
        return;
      }
      if (isNaN(parseFloat(data.weight)) || parseFloat(data.weight) <= 0) {
        setFormError('Please enter a valid weight.');
        return;
      }
    }

    const dateKey = selectedDate.toDateString();

    if (data.id == null) {
      // Add new entry
      const newEntry = {
        id: Date.now(),
        name,
        type: activeForm,
        date: selectedDate,
        time,
        ...(activeForm === 'exercise' && { sets: data.sets }),
        ...(activeForm === 'meal' && { 
          amount: data.amount,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats
        }),
        ...(activeForm === 'sleep' && { bedtime: data.bedtime, waketime: data.waketime, duration: calculateSleepDuration(data.bedtime, data.waketime) }),
        ...(activeForm === 'measurements' && { 
          weight: parseFloat(data.weight),
          neck: data.neck ? parseFloat(data.neck) : null,
          shoulders: data.shoulders ? parseFloat(data.shoulders) : null,
          chest: data.chest ? parseFloat(data.chest) : null,
          waist: data.waist ? parseFloat(data.waist) : null,
          hips: data.hips ? parseFloat(data.hips) : null,
          thigh: data.thigh ? parseFloat(data.thigh) : null,
          arm: data.arm ? parseFloat(data.arm) : null,
          chestSkinfold: data.chestSkinfold ? parseFloat(data.chestSkinfold) : null,
          abdominalSkinfold: data.abdominalSkinfold ? parseFloat(data.abdominalSkinfold) : null,
          thighSkinfold: data.thighSkinfold ? parseFloat(data.thighSkinfold) : null,
          tricepSkinfold: data.tricepSkinfold ? parseFloat(data.tricepSkinfold) : null,
          subscapularSkinfold: data.subscapularSkinfold ? parseFloat(data.subscapularSkinfold) : null,
          suprailiacSkinfold: data.suprailiacSkinfold ? parseFloat(data.suprailiacSkinfold) : null,
          notes: data.notes
        })
      };
      setEntries((prev) => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newEntry]
      }));
      resetForm();
      // Close measurements form after successful submission
      if (activeForm === 'measurements') {
        setShowMeasurementsInput(false);
      }
      // Don't close the input forms after adding entries - let user continue adding
    } else {
      // Update existing
      setEntries((prev) => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).map((e) => 
          e.id === data.id ? { 
            ...e, 
            name, 
            type: activeForm,
            date: selectedDate, 
            time,
            ...(activeForm === 'exercise' && { sets: data.sets }),
            ...(activeForm === 'meal' && { 
              amount: data.amount,
              calories: data.calories,
              protein: data.protein,
              carbs: data.carbs,
              fats: data.fats
            }),
            ...(activeForm === 'sleep' && { bedtime: data.bedtime, waketime: data.waketime, duration: calculateSleepDuration(data.bedtime, data.waketime) }),
            ...(activeForm === 'measurements' && { 
              weight: parseFloat(data.weight),
              neck: data.neck ? parseFloat(data.neck) : null,
              shoulders: data.shoulders ? parseFloat(data.shoulders) : null,
              chest: data.chest ? parseFloat(data.chest) : null,
              waist: data.waist ? parseFloat(data.waist) : null,
              hips: data.hips ? parseFloat(data.hips) : null,
              thigh: data.thigh ? parseFloat(data.thigh) : null,
              arm: data.arm ? parseFloat(data.arm) : null,
              chestSkinfold: data.chestSkinfold ? parseFloat(data.chestSkinfold) : null,
              abdominalSkinfold: data.abdominalSkinfold ? parseFloat(data.abdominalSkinfold) : null,
              thighSkinfold: data.thighSkinfold ? parseFloat(data.thighSkinfold) : null,
              tricepSkinfold: data.tricepSkinfold ? parseFloat(data.tricepSkinfold) : null,
              subscapularSkinfold: data.subscapularSkinfold ? parseFloat(data.subscapularSkinfold) : null,
              suprailiacSkinfold: data.suprailiacSkinfold ? parseFloat(data.suprailiacSkinfold) : null,
              notes: data.notes
            })
          } : e
        )
      }));
      resetForm();
      // Close measurements form after successful edit
      if (activeForm === 'measurements') {
        setShowMeasurementsInput(false);
      }
      // Don't close the input forms after editing entries
    }
  }

  function handleEdit(entry) {
    setFormState({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      sets: entry.sets || [],
      amount: entry.amount || '',
      calories: entry.calories || '',
      protein: entry.protein || '',
      carbs: entry.carbs || '',
      fats: entry.fats || '',
      bedtime: entry.bedtime || { hour: 10, minute: 0, period: 'PM' },
      waketime: entry.waketime || { hour: 6, minute: 0, period: 'AM' },
      duration: entry.duration || '',
      intensity: entry.intensity || '',
      quality: entry.quality || '',
      weight: entry.weight || '',
      neck: entry.neck || '',
      shoulders: entry.shoulders || '',
      chest: entry.chest || '',
      waist: entry.waist || '',
      hips: entry.hips || '',
      thigh: entry.thigh || '',
      arm: entry.arm || '',
      chestSkinfold: entry.chestSkinfold || '',
      abdominalSkinfold: entry.abdominalSkinfold || '',
      thighSkinfold: entry.thighSkinfold || '',
      tricepSkinfold: entry.tricepSkinfold || '',
      subscapularSkinfold: entry.subscapularSkinfold || '',
      suprailiacSkinfold: entry.suprailiacSkinfold || '',
      notes: entry.notes || ''
    });
    setActiveForm(entry.type);
    if (entry.type === 'meal') {
      setShowMealInput(true);
    } else if (entry.type === 'exercise') {
      setShowExerciseInput(true);
    } else if (entry.type === 'sleep') {
      setShowSleepInput(true);
    } else if (entry.type === 'measurements') {
      setShowMeasurementsInput(true);
    }
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
    const dateKey = selectedDate.toDateString();
    setEntries((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((e) => e.id !== id)
    }));
    if (formState.id === id) {
      resetForm();
    }
  }

  // Handle autocomplete selection
  const handleAutocompleteSelect = (item) => {
    if (activeForm === 'exercise' && item.defaultSets && item.defaultReps) {
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
    localStorage.setItem('healthTrackerSettings', JSON.stringify(newSettings));
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

  const handleInfoSave = () => {
    if (!selectedEntry) return;

    const dateKey = selectedDate.toDateString();
    setEntries((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).map((e) => 
        e.id === selectedEntry.id ? { 
          ...e, 
          notes: infoFormData.notes
        } : e
      )
    }));
    
    setShowInfoModal(false);
    setSelectedEntry(null);
    setInfoFormData({ notes: '' });
  };

  const handleInfoCancel = () => {
    setShowInfoModal(false);
    setSelectedEntry(null);
    setInfoFormData({ notes: '' });
  };

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

  const handleDrop = (e, targetEntry) => {
    e.preventDefault();
    
    if (!draggedEntry || draggedEntry.id === targetEntry.id) {
      return;
    }

    const dateKey = selectedDate.toDateString();
    const currentEntries = entries[dateKey] || [];
    
    // Find indices of dragged and target entries
    const draggedIndex = currentEntries.findIndex(entry => entry.id === draggedEntry.id);
    const targetIndex = currentEntries.findIndex(entry => entry.id === targetEntry.id);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Create new array with reordered entries
    const newEntries = [...currentEntries];
    const [draggedItem] = newEntries.splice(draggedIndex, 1);
    newEntries.splice(targetIndex, 0, draggedItem);

    // Update entries
    setEntries(prev => ({
      ...prev,
      [dateKey]: newEntries
    }));
  };

  return (
    <div className="w-full">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4 px-2 sm:px-0">
        <div className="flex justify-center">
          <Calendar selectedDate={selectedDate} onSelectDate={handleDateSelect} entries={entries} />
        </div>
      </div>

      {/* Inline FAQ / Features Accordion below calendar */}
      {showFAQ && (
        <div className="w-full max-w-2xl mx-auto mt-6 px-2 sm:px-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Frequent Questions</h2>
            <button
              onClick={() => setShowFAQ(false)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close FAQ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
          <details className="group p-3 sm:p-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
              <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">How do I log a meal with nutrition info?</span>
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
            How do I log a meal?
            Click a date on the calendar, select "Add Meal", then fill in the meal name and amount (e.g., "1 cup"). You can optionally add nutrition details like calories, protein, carbs, and fats, but these aren't required. Use the autocomplete to quickly select from your food library.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How do I log exercises?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Select "Add Exercise", enter the exercise name, then click "Add Set" for each set. You can optionally enter reps and load (e.g., "50kg") for each set - these details aren't required. Add as many sets as needed.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">What is the food and exercise library?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Your personal database of frequently used foods and exercises. Click "Manage Library" to add, edit, or delete items. The autocomplete will suggest items from your library as you type, making data entry much faster.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How do I reorder my entries?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Simply drag and drop any entry to reorder them. Entries with the same time are grouped together and can be collapsed/expanded by clicking the time header.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How are entries grouped by time?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              All entries for the same time (e.g., 8:00 AM) are automatically grouped together under a single time header. This keeps your log organized and makes it easy to see what you did at specific times. Click the time header to collapse or expand each group. You can have multiple meals, exercises, or sleep entries at the same time.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">What are the quick-add buttons?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              These show your most recently used food and exercise items. Click any button to instantly add that item to your log with pre-filled details, saving you time on data entry.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How do I add notes to entries?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Click the information (i) button next to any entry to add notes or additional details. This is useful for tracking how you felt, intensity levels, or any other observations.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">Where is my data stored?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              All data is stored locally in your browser using IndexedDB, which is more reliable than regular storage. Your data stays private and is not sent to any servers. Use the Export feature to backup your data.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How do I export my data?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              In the daily panel header, click "Export" and choose from JSON (for data backup), CSV (for spreadsheet analysis), or PDF (for printing). This includes all your entries with nutrition and exercise details.
            </div>
          </details>
        </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full h-full max-h-screen overflow-auto bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
              <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-bold text-gray-900 truncate pr-2">
                    {headerText}
                  </div>
                  
                  {/* Menu button */}
                  <div className="relative menu-container z-50">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-all duration-200 shadow-sm min-h-[44px]"
                      title="Menu"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="hidden sm:inline">Menu</span>
                    </button>
                    
                    {/* Menu dropdown */}
                    {showMenu && (
                      <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="py-1">
                          {/* Export submenu */}
                          <div className="relative">
                            <button
                              onClick={() => setShowExportSubmenu(!showExportSubmenu)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export
                              </div>
                              <svg className={`w-4 h-4 transition-transform ${showExportSubmenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {/* Export submenu items */}
                            {showExportSubmenu && (
                              <div className="ml-2 sm:ml-4 mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
                                <button
                                  onClick={() => {
                                    setShowMenu(false);
                                    setShowExportSubmenu(false);
                                    exportToJSON();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Export as JSON
                                </button>
                                <button
                                  onClick={() => {
                                    setShowMenu(false);
                                    setShowExportSubmenu(false);
                                    exportToCSV();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  Export as CSV
                                </button>
                                <button
                                  onClick={() => {
                                    setShowMenu(false);
                                    setShowExportSubmenu(false);
                                    exportToPDF();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Export as PDF
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              setShowFAQ(!showFAQ);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            FAQ
                          </button>
                          {/* Quick Add Manager submenu */}
                          <div className="relative">
                            <button
                              onClick={() => setShowQuickAddSubmenu(!showQuickAddSubmenu)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Quick Add Manager
                              </div>
                              <svg className={`w-4 h-4 transition-transform ${showQuickAddSubmenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {/* Quick Add submenu items */}
                            {showQuickAddSubmenu && (
                              <div className="ml-2 sm:ml-4 mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
                                <button
                                  onClick={() => {
                                    setShowMenu(false);
                                    setShowQuickAddSubmenu(false);
                                    handleOpenQuickAddManager('food');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Manage Quick Add Food
                                </button>
                                <button
                                  onClick={() => {
                                    setShowMenu(false);
                                    setShowQuickAddSubmenu(false);
                                    handleOpenQuickAddManager('exercise');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Manage Quick Add Exercise
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              setShowSettings(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {/* Entry Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {formState.id == null ? `Add New ${activeForm.charAt(0).toUpperCase() + activeForm.slice(1)} Entry` : `Edit ${activeForm.charAt(0).toUpperCase() + activeForm.slice(1)} Entry`}
                </h3>
                
                <form className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <div>
                      <TimePicker onChange={setTime} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {settings.enableMeals && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveForm('meal');
                          setShowMealInput(true);
                        }}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          activeForm === 'meal'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        🍽️ Add Meal
                      </button>
                    )}
                    {settings.enableExercise && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveForm('exercise');
                          setShowExerciseInput(true);
                        }}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          activeForm === 'exercise'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        💪 Add Exercise
                      </button>
                    )}
                    {settings.enableSleep && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveForm('sleep');
                          setShowSleepInput(true);
                        }}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          activeForm === 'sleep'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        😴 Add Sleep
                      </button>
                    )}
                    {settings.enableMeasurements && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveForm('measurements');
                          setShowMeasurementsInput(true);
                        }}
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          activeForm === 'measurements'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        📏 Add Measurements
                      </button>
                    )}
                  </div>


                  {/* Meal Form Fields */}
                  {settings.enableMeals && activeForm === 'meal' && showMealInput && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={settings.enableQuickAddFood}
                                  onChange={(e) => updateSetting('enableQuickAddFood', e.target.checked)}
                                  className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1 sm:focus:ring-2"
                                />
                                Quick Add
                              </label>
                            </div>
                          </div>
                      </div>

                        {/* Quick Add Food Buttons */}
                        {settings.enableQuickAddFood && frequentItems.food.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Add Food:</label>
                            <div className="flex flex-wrap gap-2">
                              {frequentItems.food.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                    handleQuickAdd(item, 'meal');
                                  }}
                                  className="px-0.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200 transition-colors flex items-center justify-center sm:px-3 sm:py-1 sm:text-sm max-w-[80px] sm:max-w-none"
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

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
                        </div>

                        <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSubmit}
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
                              if (formState.id == null) {
                                setFormState((s) => ({ ...s, name: '', amount: '' }));
                              }
                            }}
                            className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            {formState.id == null ? 'Cancel' : 'Cancel Edit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Exercise Form Fields */}
                  {settings.enableExercise && activeForm === 'exercise' && showExerciseInput && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="exercise-name">
                            Exercise Name
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <AutocompleteInput
                                type="exercise"
                                value={formState.name}
                                onChange={(value) => setFormState((s) => ({ ...s, name: value }))}
                                onSelect={handleAutocompleteSelect}
                                placeholder="e.g., Push-ups, Squats, Bench Press"
                                autoFocus
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={settings.enableQuickAddExercise}
                                  onChange={(e) => updateSetting('enableQuickAddExercise', e.target.checked)}
                                  className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-1 sm:focus:ring-2"
                                />
                                Quick Add
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Quick Add Exercise Buttons */}
                        {settings.enableQuickAddExercise && frequentItems.exercise.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Add Exercise:</label>
                            <div className="flex flex-wrap gap-2">
                              {frequentItems.exercise.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                    handleQuickAdd(item, 'exercise');
                                  }}
                                  className="px-0.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full hover:bg-green-200 transition-colors flex items-center justify-center sm:px-3 sm:py-1 sm:text-sm max-w-[80px] sm:max-w-none"
                                >
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Individual Sets */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Sets ({formState.sets.length})
                            </label>
                            <button
                              type="button"
                              onClick={addSet}
                              className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Set
                            </button>
                          </div>
                          
                          {formState.sets.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <p className="text-sm text-gray-500">No sets added yet. Click "Add Set" to get started.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {formState.sets.map((set, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-gray-700">Set {index + 1}</h4>
                                    <button
                                      type="button"
                                      onClick={() => removeSet(index)}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                      title="Remove set"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Reps
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-sm"
                                        placeholder="10"
                                        value={set.reps}
                                        onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Load
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-sm"
                                        placeholder="50kg"
                                        value={set.load}
                                        onChange={(e) => updateSet(index, 'load', e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                      />
                                    </div>
                                  </div>
                                  
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleSubmit}
                            className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {formState.id == null ? 'Add Exercise Entry' : 'Save Changes'}
                    </button>
                    
                      <button
                        type="button"
                            onClick={() => {
                              setShowExerciseInput(false);
                              if (formState.id == null) {
                                setFormState((s) => ({ ...s, name: '', sets: [] }));
                              }
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
                  {settings.enableSleep && activeForm === 'sleep' && showSleepInput && (
                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
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
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-md bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                            onClick={handleSubmit}
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
                              if (formState.id == null) {
                                setFormState((s) => ({ 
                                  ...s, 
                                  name: '', 
                                  bedtime: { hour: 10, minute: 0, period: 'PM' }, 
                                  waketime: { hour: 6, minute: 0, period: 'AM' } 
                                }));
                              }
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
                  {settings.enableMeasurements && activeForm === 'measurements' && showMeasurementsInput && (
                    <div className="mt-4">
                      <MeasurementsForm
                        settings={settings}
                        onSubmit={(data) => {
                          // Update formState with the data from MeasurementsForm and submit
                          setFormState(prev => {
                            const updatedState = {
                              ...prev,
                              ...data
                            };
                            
                            // Submit the form with the updated data
                            setTimeout(() => {
                              handleSubmitWithData(updatedState);
                            }, 0);
                            
                            return updatedState;
                          });
                        }}
                        onCancel={() => {
                          setShowMeasurementsInput(false);
                          if (formState.id == null) {
                            setFormState((s) => ({ 
                              ...s, 
                              weight: '', 
                              neck: '', 
                              shoulders: '', 
                              chest: '', 
                              waist: '', 
                              hips: '', 
                              thigh: '', 
                              arm: '',
                              chestSkinfold: '',
                              abdominalSkinfold: '',
                              thighSkinfold: '',
                              tricepSkinfold: '',
                              subscapularSkinfold: '',
                              suprailiacSkinfold: '',
                              notes: '' 
                            }));
                          }
                        }}
                        initialData={formState.id ? formState : null}
                      />
                    </div>
                  )}
                  
                  {formError && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {formError}
                    </div>
                  )}
                </form>
              </div>

              {/* Entries List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">Entries</h3>
                  {currentDateEntries.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {currentDateEntries.length} entry{currentDateEntries.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <GroupedEntries 
                  entries={currentDateEntries.filter(entry => {
                    // Filter entries based on enabled features
                    if (entry.type === 'meal' && !settings.enableMeals) return false;
                    if (entry.type === 'exercise' && !settings.enableExercise) return false;
                    if (entry.type === 'sleep' && !settings.enableSleep) return false;
                    if (entry.type === 'measurements' && !settings.enableMeasurements) return false;
                    return true;
                  })}
                  formatTime={formatTime}
                  settings={settings}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onInfoClick={handleInfoClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              </div>

              {/* FAQ Section in Modal */}
              {showFAQ && (
                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Frequent Questions</h3>
                    <button
                      onClick={() => setShowFAQ(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Close FAQ"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <details className="group p-3 sm:p-4" open>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">How do I log a meal with nutrition info?</span>
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Click a date on the calendar, select "Add Meal", then fill in the meal name and amount (e.g., "1 cup"). You can optionally add nutrition details like calories, protein, carbs, and fats, but these aren't required. Use the autocomplete to quickly select from your food library.
                      </div>
                    </details>
                    <details className="group p-3 sm:p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">How do I log exercises with multiple sets?</span>
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Select "Add Exercise", enter the exercise name, then click "Add Set" for each set. You can optionally enter reps and load (e.g., "50kg") for each set - these details aren't required. Add as many sets as needed.
                      </div>
                    </details>
                    <details className="group p-3 sm:p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">What is the food and exercise library?</span>
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Your personal database of frequently used foods and exercises. Click "Manage Library" to add, edit, or delete items. The autocomplete will suggest items from your library as you type, making data entry much faster.
                      </div>
                    </details>
                    <details className="group p-3 sm:p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">How do I add notes to entries?</span>
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Click the information (i) button next to any entry to add notes or additional details. This is useful for tracking how you felt, intensity levels, or any other observations.
                      </div>
                    </details>
                    <details className="group p-3 sm:p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">Where is my data stored?</span>
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        All data is stored locally in your browser using IndexedDB, which is more reliable than regular storage. Your data stays private and is not sent to any servers. Use the Export feature to backup your data.
                      </div>
                    </details>
                    <details className="group p-3 sm:p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-4">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 pr-2">How do I export my data?</span>
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Click the Menu button in the top right and choose from JSON (for data backup), CSV (for spreadsheet analysis), or PDF (for printing). This includes all your entries with nutrition and exercise details.
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {/* Close modal */}
              <div className="mt-8 sm:mt-12 text-center">
                <button
                  className="inline-flex items-center px-6 sm:px-8 py-3 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  onClick={closeModal}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Information Modal */}
      {showInfoModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleInfoCancel} />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl mx-4">
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

      {/* Quick Add Manager Modal */}
      {showQuickAddManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickAddManager(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Quick Add {quickAddType === 'food' ? 'Food' : 'Exercise'}
                </h3>
                <button
                  onClick={() => setShowQuickAddManager(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Select up to 5 items to appear in quick add buttons. Currently selected: {frequentItems[quickAddType].length}/5
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <QuickAddManagerContent 
                type={quickAddType}
                frequentItems={frequentItems}
                onToggleItem={toggleQuickAddItem}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowQuickAddManager(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Done
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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

      {/* Features Modal */}
      {showFeaturesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFeaturesModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Toggle Features</h3>
                <button
                  onClick={() => setShowFeaturesModal(false)}
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
                {/* Feature Toggles */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Feature Toggles</h4>
                  <p className="text-sm text-gray-600 mb-4">Enable or disable specific tracking features</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="modal-enableMeals" className="text-sm font-medium text-gray-700">
                          🍽️ Meals & Nutrition
                        </label>
                        <p className="text-xs text-gray-500">Track food intake and calories</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="modal-enableMeals"
                          checked={settings.enableMeals}
                          onChange={(e) => updateSetting('enableMeals', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="modal-enableExercise" className="text-sm font-medium text-gray-700">
                          💪 Exercise & Workouts
                        </label>
                        <p className="text-xs text-gray-500">Track workouts and physical activity</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="modal-enableExercise"
                          checked={settings.enableExercise}
                          onChange={(e) => updateSetting('enableExercise', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="modal-enableSleep" className="text-sm font-medium text-gray-700">
                          😴 Sleep Tracking
                        </label>
                        <p className="text-xs text-gray-500">Track sleep duration and patterns</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="modal-enableSleep"
                          checked={settings.enableSleep}
                          onChange={(e) => updateSetting('enableSleep', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="modal-enableMeasurements" className="text-sm font-medium text-gray-700">
                          📏 Body Measurements
                        </label>
                        <p className="text-xs text-gray-500">Track weight, girth, and skinfold measurements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="modal-enableMeasurements"
                          checked={settings.enableMeasurements}
                          onChange={(e) => updateSetting('enableMeasurements', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowFeaturesModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Features Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setShowFeaturesModal(true)}
          className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200 border border-gray-300"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Toggle Features
        </button>
      </div>

    </div>
  );
};

export default DateTimeSelector;
