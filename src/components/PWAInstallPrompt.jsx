import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [userEngaged, setUserEngaged] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Track user engagement - only show prompt to engaged users
    let engagementTimer;
    let pageViews = 0;
    let timeOnSite = 0;
    
    const trackEngagement = () => {
      pageViews++;
      timeOnSite += 30; // Track in 30-second intervals
      
      // Show prompt only if user has been engaged for at least 2 minutes
      // or has visited multiple pages
      if (timeOnSite >= 120 || pageViews >= 3) {
        setUserEngaged(true);
        clearInterval(engagementTimer);
      }
    };
    
    // Start tracking engagement
    engagementTimer = setInterval(trackEngagement, 30000); // Check every 30 seconds
    
    // Check if the app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        setIsInstalled(true);
        return;
      }

      // Check if the app was previously installed
      if (typeof window !== 'undefined') {
        const wasInstalled = localStorage.getItem('pwa-installed');
        if (wasInstalled === 'true') {
          setIsInstalled(true);
          return;
        }
      }
    };

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Store the prompt for later use when user becomes engaged
      // Don't show immediately - wait for engagement
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      // Only run on client side
      if (typeof window !== 'undefined') {
        localStorage.setItem('pwa-installed', 'true');
      }
    };

    // Check if already installed
    checkIfInstalled();

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (engagementTimer) {
        clearInterval(engagementTimer);
      }
    };
  }, []);

  // Show prompt when user becomes engaged
  useEffect(() => {
    if (userEngaged && deferredPrompt && !isInstalled) {
      setShowInstallPrompt(true);
    }
  }, [userEngaged, deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    console.log('PWA: Showing install prompt');
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`PWA: User response to install prompt: ${outcome}`);
    
    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    // Also don't show for 7 days
    localStorage.setItem('pwa-prompt-dismissed-until', Date.now() + (7 * 24 * 60 * 60 * 1000));
  };

  // TEMPORARILY DISABLED FOR DEBUGGING - Return early to disable component
  return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Add to Home Screen
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Get quick access to your calorie tracking with offline support.
            </p>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                Add
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200"
              >
                Maybe later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

