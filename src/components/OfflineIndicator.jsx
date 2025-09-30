import React, { useState, useEffect } from 'react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true); // Default to true for SSR
  const [showIndicator, setShowIndicator] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Set initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      // Hide indicator after 3 seconds when coming back online
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show indicator on mount if offline
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) {
    return null;
  }

  // Don't render on server side
  if (!isClient) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm transition-all duration-300 ${
      isOnline ? 'animate-fade-in' : 'animate-slide-down'
    }`}>
      <div className={`rounded-lg shadow-lg border p-3 ${
        isOnline 
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
          : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
            isOnline 
              ? 'bg-green-100 dark:bg-green-800' 
              : 'bg-orange-100 dark:bg-orange-800'
          }`}>
            {isOnline ? (
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              isOnline 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-orange-800 dark:text-orange-200'
            }`}>
              {isOnline ? 'Back online' : 'You\'re offline'}
            </p>
            <p className={`text-xs ${
              isOnline 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {isOnline 
                ? 'Your data will sync automatically' 
                : 'Some features may be limited. Your data is saved locally.'
              }
            </p>
          </div>
          
          <button
            onClick={() => setShowIndicator(false)}
            className={`flex-shrink-0 ${
              isOnline 
                ? 'text-green-400 hover:text-green-600 dark:hover:text-green-300' 
                : 'text-orange-400 hover:text-orange-600 dark:hover:text-orange-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;

