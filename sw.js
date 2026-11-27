const CACHE_NAME = 'civil-registry-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-app.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('SW cache.addAll warning:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Don't intercept Firebase, Google Docs, or Google API sync requests
  if (
    url.includes('docs.google.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebase') ||
    url.includes('firestore')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        // Stale-while-revalidate for local assets when online
        fetch(e.request)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'));
    })
  );
});
