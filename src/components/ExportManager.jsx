import React, { useState, useEffect } from 'react';

const ExportManager = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;
    
    const loadData = () => {
      try {
        const healthEntries = localStorage.getItem('healthEntries');
        const settings = localStorage.getItem('healthTrackerSettings');
        
        const exportData = {
          healthEntries: healthEntries ? JSON.parse(healthEntries) : {},
          settings: settings ? JSON.parse(settings) : {},
          exportDate: new Date().toISOString(),
          version: '1.0.0'
        };
        
        setData(exportData);
      } catch (error) {
        console.error('Error loading data for export:', error);
      }
    };

    loadData();
  }, []);

  // CSV Export function
  const exportToCSV = () => {
    if (!data) {
      alert('No data available to export');
      return;
    }

    setLoading(true);
    
    try {
      const { healthEntries } = data;
      // Convert the date-keyed object to a flat array of entries
      const entries = Object.values(healthEntries).flat();
      
      if (entries.length === 0) {
        alert('No food entries found to export');
        setLoading(false);
        return;
      }

      // Create CSV headers
      const headers = ['Date', 'Time', 'Type', 'Name', 'Calories', 'Protein', 'Carbs', 'Fat', 'Notes'];
      
      // Create CSV rows
      const csvRows = entries.map(entry => [
        entry.date ? (entry.date instanceof Date ? entry.date.toLocaleDateString() : entry.date) : '',
        entry.time || '',
        entry.type || 'meal',
        entry.name || '',
        entry.calories || 0,
        entry.protein || 0,
        entry.carbs || 0,
        entry.fats || 0, // Note: using 'fats' instead of 'fat' to match the data structure
        entry.notes || ''
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `calorie_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('CSV file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV file');
    } finally {
      setLoading(false);
    }
  };

  // JSON Export function
  const exportToJSON = () => {
    if (!data) {
      alert('No data available to export');
      return;
    }

    setLoading(true);
    
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `calorie_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('JSON backup file downloaded successfully!');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      alert('Error exporting JSON file');
    } finally {
      setLoading(false);
    }
  };

  // PDF Export function (basic implementation)
  const exportToPDF = () => {
    if (!data) {
      alert('No data available to export');
      return;
    }

    setLoading(true);
    
    try {
      const { healthEntries } = data;
      // Convert the date-keyed object to a flat array of entries
      const entries = Object.values(healthEntries).flat();
      
      if (entries.length === 0) {
        alert('No food entries found to export');
        setLoading(false);
        return;
      }

      // Create a simple HTML report
      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Calorie Tracker Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Calorie Tracker Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          
          <div class="summary">
            <h2>Summary</h2>
            <p>Total Entries: ${entries.length}</p>
            <p>Total Calories: ${entries.reduce((sum, entry) => sum + (parseFloat(entry.calories) || 0), 0)}</p>
          </div>
          
          <h2>Food Entries</h2>
          <table>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Name</th>
              <th>Calories</th>
              <th>Protein</th>
              <th>Carbs</th>
              <th>Fat</th>
            </tr>
            ${entries.map(entry => `
              <tr>
                <td>${entry.date ? (entry.date instanceof Date ? entry.date.toLocaleDateString() : entry.date) : ''}</td>
                <td>${entry.time || ''}</td>
                <td>${entry.name || ''}</td>
                <td>${entry.calories || 0}</td>
                <td>${entry.protein || 0}</td>
                <td>${entry.carbs || 0}</td>
                <td>${entry.fats || 0}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;

      // For now, we'll create an HTML file that can be printed to PDF
      const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `calorie_tracker_report_${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('HTML report downloaded! You can open it in your browser and print to PDF.');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF file');
    } finally {
      setLoading(false);
    }
  };

  // Don't render on server side
  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">CSV Export</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Export your food logs and measurements as a CSV file for use in spreadsheet applications.
        </p>
        <button 
          onClick={exportToCSV}
          disabled={loading || !data}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">JSON Export</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Export your complete data as a JSON file for backup or migration purposes.
        </p>
        <button 
          onClick={exportToJSON}
          disabled={loading || !data}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Exporting...' : 'Download JSON'}
        </button>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">PDF Report</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Generate a comprehensive HTML report that you can print to PDF.
        </p>
        <button 
          onClick={exportToPDF}
          disabled={loading || !data}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Generating...' : 'Download HTML Report'}
        </button>
      </div>
      
      {!data && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No data found. Start logging meals to enable export options.</p>
        </div>
      )}
    </div>
  );
};

export default ExportManager;
