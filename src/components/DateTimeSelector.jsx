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
    return formatDate(selectedDate);
  }, [selectedDate]);

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

      {/* Inline FAQ / Features Accordion below calendar */}
      <div className="w-full max-w-2xl mx-auto mt-6 px-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Frequent Questions</h2>
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
          <details className="group p-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How do I log a meal?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Click a date on the calendar, then use the time picker and enter a meal name. Press “Add Entry”.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">Where can I see meals for a specific day?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Select a date to open the daily panel. All entries for that date appear in the list below the form.
            </div>
          </details><details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">Where are my data entries saved?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              All the data is saved in your browser's local storage.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">Can I edit or delete an entry?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              Yes. Use the Edit button to change the name or time, or Delete to remove it.
            </div>
          </details>
          <details className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-base font-semibold text-gray-900">How do exports work?</span>
              <svg className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div className="mt-3 text-sm text-gray-600 leading-relaxed">
              In the daily panel header, open Export and choose JSON, CSV, or PDF to download your data.
            </div>
          </details>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full h-full max-h-screen overflow-auto bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      {headerText}
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full w-fit">
                      {currentDateEntries.length} entries
                    </div>
                  </div>
                  
                  {/* Export dropdown */}
                  <div className="relative group self-start sm:self-auto">
                    <button
                      className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Export all meal entries data"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">Export Data</span>
                      <span className="sm:hidden">Export</span>
                      <svg className="ml-2 h-4 w-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={exportToJSON}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export as JSON
                        </button>
                        <button
                          onClick={exportToCSV}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Export as CSV
                        </button>
                        <button
                          onClick={exportToPDF}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              {/* Meal Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {formState.id == null ? 'Add New Meal Entry' : 'Edit Meal Entry'}
                </h3>
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <TimePicker onChange={setTime} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="meal-name">
                        Meal Name
                      </label>
                      <input
                        id="meal-name"
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="e.g., Breakfast, Lunch, Dinner, Snack"
                        value={formState.name}
                        onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {formState.id == null ? 'Add Entry' : 'Save Changes'}
                    </button>
                    
                    {formState.id != null && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  
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
                  <h3 className="text-lg font-semibold text-gray-900">Meal Entries</h3>
                  {currentDateEntries.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {currentDateEntries.length} entry{currentDateEntries.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {currentDateEntries.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No meals logged yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Add your first meal entry for {formatDate(selectedDate)}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentDateEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              {formatTime(entry.time)}
                            </div>
                            <div className="font-medium text-gray-900 text-lg">
                              {entry.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(entry)}
                            className="inline-flex items-center p-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                            aria-label="Edit entry"
                            title="Edit entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="inline-flex items-center p-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Delete entry"
                            title="Delete entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
    </div>
  );
};

export default DateTimeSelector;
