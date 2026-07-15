const CACHE_NAME = 'insta-glide-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to network
  event.respondWith(
    fetch(event.request).catch(() => {
      // Basic fallback
      return caches.match(event.request);
    })
  );
});
