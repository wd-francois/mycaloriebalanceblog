import { useState, useEffect } from 'react';

const ExportManager = () => {
  const [data, setData] = useState(null);

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



  // Don't render on server side
  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {!data && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No data found. Start logging meals to enable export options.</p>
        </div>
      )}
    </div>
  );
};

export default ExportManager;
