// Service Worker for My Calorie Balance Blog
const CACHE_NAME = 'calorie-balance-v5';
const urlsToCache = [
  '/',
  '/library/',
  '/settings/',
  '/export/',
  '/favicon.ico',
  '/favicon.svg',
  '/manifest.json'
];

// Check if a request is cacheable (exclude unsupported schemes)
function isCacheableRequest(request) {
  const url = new URL(request.url);
  // Only cache http/https requests, exclude chrome-extension, moz-extension, etc.
  return url.protocol === 'http:' || url.protocol === 'https:';
}

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline, but always fetch CSS files fresh
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Always fetch CSS files fresh to avoid styling issues
  if (request.destination === 'style' || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, try cache as fallback
        return caches.match(request);
      })
    );
    return;
  }
  
  // For HTML pages, always try network first to ensure fresh content
  if (request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, cache the response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache as fallback
          return caches.match(request);
        })
    );
    return;
  }
  
  // For other resources, use network-first strategy for better live updates
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If successful, cache the response (only for supported schemes)
        if (response.status === 200 && isCacheableRequest(request)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache as fallback
        return caches.match(request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


