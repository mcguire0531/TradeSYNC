const CACHE_NAME = 'tradesync-v3';
const APP_SHELL = [
  './',
  './index.html',
  './css/01-styles.css',
  './css/02-styles.css',
  './css/03-styles.css',
  './css/04-styles.css',
  './css/05-task-updates.css',
  './css/06-collaboration-updates.css',
  './js/01-foundation.js',
  './js/02-data-state.js',
  './js/03-shell-home.js',
  './js/04-rooms.js',
  './js/05-tasks.js',
  './js/06-inspections-constraints.js',
  './js/07-modals-actions.js',
  './js/08-events-boot.js',
  './js/09-task-updates.js',
  './js/10a-collaboration-core.js',
  './js/10b1-task-ui.js',
  './js/10b2-task-view.js',
  './js/10b3-documentation-ui.js',
  './js/10b4-image-storage.js',
  './js/10c1-task-modals.js',
  './js/10c2-task-actions.js',
  './js/10c3-status-actions.js',
  './js/10c4-inspection-comments.js',
  './js/10c5-inspection-view.js',
  './js/10d1-constraint-ui.js',
  './js/10d2-constraint-actions.js',
  './js/10d3-clash-modal.js',
  './js/10d4-events.js',
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
