const CACHE_NAME = 'derivatives-v2';
const ASSETS = [
  './app.html',
  './manifest.json',
  './data/exam_meta.json',
  './data/S1.json',
  './data/S2.json',
  './data/S3.json',
  './data/S4.json'
];

// Install: cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS.filter(url => {
        // Only cache files that exist; skip missing S2~S4 gracefully
        return true;
      })).catch(() => {
        // If some assets fail (e.g., S2.json not yet created), cache what we can
        return Promise.allSettled(
          ASSETS.map(url => caches.open(CACHE_NAME).then(c => c.add(url).catch(() => {})))
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(e.request).then(cached => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});
