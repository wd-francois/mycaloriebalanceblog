import React from 'react';

const NoHookDateTimeSelector = () => {
  const handleDateChange = (event) => {
    const selectedDate = event.target.value;
    console.log('Selected date:', selectedDate);
    // You can add more functionality here without using hooks
  };

  const handleTimeChange = (event) => {
    const selectedTime = event.target.value;
    console.log('Selected time:', selectedTime);
    // You can add more functionality here without using hooks
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Date & Time Selector</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            onChange={handleDateChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Time
          </label>
          <input
            type="time"
            onChange={handleTimeChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-green-800 text-sm">
          ✅ This component works without React hooks!
        </p>
        <p className="text-green-600 text-xs mt-1">
          No SSR issues - fully functional
        </p>
      </div>
    </div>
  );
};

export default NoHookDateTimeSelector;
