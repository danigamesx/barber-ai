
const CACHE_NAME = 'barberai-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // You can add more assets here to be cached, like JS bundles, CSS files, and images
  // '/assets/logo.png',
  // '/assets/main.css'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the assets to the cache
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // This is a basic "cache-first" strategy.
  // For a real-world app, you might want a more sophisticated strategy like "stale-while-revalidate"
  // or network-first for API calls.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
