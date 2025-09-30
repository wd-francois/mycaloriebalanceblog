import React, { useState } from 'react';

const SimpleDateTimeSelector = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Simple Date Selector</h3>
      <input
        type="date"
        value={selectedDate.toISOString().split('T')[0]}
        onChange={(e) => setSelectedDate(new Date(e.target.value))}
        className="border rounded px-3 py-2"
      />
      <p className="mt-2 text-sm text-gray-600">
        Selected: {selectedDate.toLocaleDateString()}
      </p>
    </div>
  );
};

export default SimpleDateTimeSelector;
