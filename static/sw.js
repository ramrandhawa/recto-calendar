/* Recto Calendar — Service Worker */

const CACHE = 'recto-v1';

const PRECACHE = [
  '/',
  '/static/styles.css',
  '/static/helpers.js',
  '/static/tweaks-panel.jsx',
  '/static/sidebar.jsx',
  '/static/week-view.jsx',
  '/static/month-search-view.jsx',
  '/static/dialogs.jsx',
  '/static/app.jsx',
  '/static/icon.svg',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  /* API calls: network-first, no caching */
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  /* Everything else: cache-first */
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
