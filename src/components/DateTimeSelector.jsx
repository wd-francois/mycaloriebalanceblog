import React, { useMemo, useState, useEffect } from 'react';
import Calendar from '@react/Calendar.jsx';
import TimePicker from '@react/TimePicker.jsx';

function formatDate(date) {
  return date?.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTime({ hour, minute, period }) {
  const mm = minute.toString().padStart(2, '0');
  return `${hour}:${mm} ${period}`;
}

const DateTimeSelector = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [time, setTime] = useState({ hour: 12, minute: 0, period: 'PM' });
  const [showModal, setShowModal] = useState(false);

  // Meal entries state - store entries per date
  const [entries, setEntries] = useState({});
  const [formState, setFormState] = useState({ id: null, name: '' });
  const [formError, setFormError] = useState('');

  // Local storage functions
  const saveToLocalStorage = (data) => {
    try {
      localStorage.setItem('mealEntries', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('mealEntries');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const converted = {};
        Object.keys(parsed).forEach(dateKey => {
          converted[dateKey] = parsed[dateKey].map(entry => ({
            ...entry,
            date: new Date(entry.date)
          }));
        });
        return converted;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return {};
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEntries = loadFromLocalStorage();
    setEntries(savedEntries);
  }, []);

  // Save to localStorage whenever entries change
  useEffect(() => {
    saveToLocalStorage(entries);
  }, [entries]);

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
      link.download = `meal-entries-${new Date().toISOString().split('T')[0]}.json`;
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
      let csvContent = 'Date,Time,Meal\n';
      
      // Add each entry
      Object.keys(entries).forEach(dateKey => {
        entries[dateKey].forEach(entry => {
          const date = new Date(entry.date);
          const formattedDate = date.toLocaleDateString();
          const formattedTime = formatTime(entry.time);
          const mealName = entry.name.replace(/"/g, '""'); // Escape quotes for CSV
          
          csvContent += `"${formattedDate}","${formattedTime}","${mealName}"\n`;
        });
      });
      
      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meal-entries-${new Date().toISOString().split('T')[0]}.csv`;
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
      doc.text('Meal Entries Report', 20, 20);
      
      // Add export info
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
      doc.text(`Total Dates: ${Object.keys(entries).length}`, 20, 45);
      doc.text(`Total Entries: ${Object.values(entries).reduce((sum, dateEntries) => sum + dateEntries.length, 0)}`, 20, 55);
      
      // Add entries
      let yPosition = 75;
      doc.setFontSize(14);
      doc.text('Meal Entries:', 20, yPosition);
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
          const mealText = `${formattedTime} - ${entry.name}`;
          
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(mealText, 30, yPosition);
          yPosition += 6;
        });
        
        yPosition += 5;
      });
      
      // Save the PDF
      doc.save(`meal-entries-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again. Please ensure jsPDF is installed.');
    }
  };

  const headerText = useMemo(() => {
    return `${formatDate(selectedDate)} at ${formatTime(time)}`;
  }, [selectedDate, time]);

  // Get entries for the current selected date
  const currentDateEntries = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return entries[dateKey] || [];
  }, [entries, selectedDate]);

  function handleDateSelect(date) {
    setSelectedDate(date);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function resetForm() {
    setFormState({ id: null, name: '' });
    setFormError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const name = formState.name.trim();

    if (!name) {
      setFormError('Meal name is required.');
      return;
    }

    const dateKey = selectedDate.toDateString();

    if (formState.id == null) {
      // Add new entry
      const newEntry = {
        id: Date.now(),
        name,
        date: selectedDate,
        time,
      };
      setEntries((prev) => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newEntry]
      }));
      resetForm();
    } else {
      // Update existing
      setEntries((prev) => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).map((e) => 
          e.id === formState.id ? { ...e, name, date: selectedDate, time } : e
        )
      }));
      resetForm();
    }
  }

  function handleEdit(entry) {
    setFormState({
      id: entry.id,
      name: entry.name,
    });
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

  return (
    <div className="w-full">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <div className="flex justify-center">
          <Calendar selectedDate={selectedDate} onSelectDate={handleDateSelect} entries={entries} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative w-full h-full max-h-screen overflow-auto bg-white dark:bg-gray-900">
            <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b p-4">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
                    {headerText}
                  </div>
                  <div className="relative group">
                    <button
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                      title="Export all meal entries data"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Data
                      <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={exportToJSON}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export as JSON
                        </button>
                        <button
                          onClick={exportToCSV}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Export as CSV
                        </button>
                        <button
                          onClick={exportToPDF}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Export as PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto p-6">
              {/* Meal Form */}
              <form className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-6" onSubmit={handleSubmit}>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <TimePicker onChange={setTime} />
                </div>
                <div className="md:col-span-8">
                  <label className="block text-sm font-medium mb-1" htmlFor="meal-name">Meal</label>
                  <input
                    id="meal-name"
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Breakfast"
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-12 flex items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    {formState.id == null ? 'Add Entry' : 'Save Changes'}
                  </button>
                  {formState.id != null && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel Edit
                    </button>
                  )}
                  {formError && <span className="text-sm text-red-600">{formError}</span>}
                </div>
              </form>

              {/* Entries List */}
              <div className="space-y-3">
                {currentDateEntries.length === 0 ? (
                  <div className="text-gray-600 dark:text-gray-400 text-sm">No entries yet for {formatDate(selectedDate)}</div>
                ) : (
                  currentDateEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-gray-200 dark:border-gray-700 rounded-md p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatTime(entry.time)} • {entry.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="inline-flex items-center px-3 py-1.5 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Close modal */}
              <div className="mt-8">
                <button
                  className="inline-flex items-center px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimeSelector;
