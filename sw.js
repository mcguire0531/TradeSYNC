const CACHE_NAME = 'tradesync-v1';
const APP_SHELL = [
  './',
  './index.html',
  './css/01-styles.css',
  './css/02-styles.css',
  './css/03-styles.css',
  './css/04-styles.css',
  './js/01-foundation.js',
  './js/02-data-state.js',
  './js/03-shell-home.js',
  './js/04-rooms.js',
  './js/05-tasks.js',
  './js/06-inspections-constraints.js',
  './js/07-modals-actions.js',
  './js/08-events-boot.js',
  './manifest.webmanifest',
  './assets/tradesync-icon.svg',
  './assets/building-riverside.jpg',
  './assets/building-maplewood.jpg',
  './assets/building-westview.jpg',
  './assets/building-pioneer.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
