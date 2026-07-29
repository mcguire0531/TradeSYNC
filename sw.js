const CACHE_NAME = 'tradesync-v9';
const APP_SHELL = [
  './',
  './index.html',
  './css/01-styles.css',
  './css/02-styles.css',
  './css/03-styles.css',
  './css/04-styles.css',
  './css/05-task-updates.css',
  './css/06-collaboration-updates.css',
  './css/07-project-areas-constraint-layout.css',
  './css/08-building-tabs-room-filters-resolved.css',
  './css/09-mobile-building-room-flow.css',
  './css/10-building-record-scope.css',
  './css/11-comment-drafts.css',
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
  './js/11a-project-areas.js',
  './js/11b-constraint-reference-layout.js',
  './js/11c-task-clash-reconciliation.js',
  './js/12a1-building-location-data.js',
  './js/12a2-building-location-modals.js',
  './js/12a3-room-filters.js',
  './js/12a4-building-room-events.js',
  './js/12b-resolved-constraints.js',
  './js/13a-mobile-building-flow.js',
  './js/13b-mobile-room-list.js',
  './js/14a-building-record-scope.js',
  './js/14b-building-constraints.js',
  './js/14c-building-inspections.js',
  './js/15-building-only-inspections.js',
  './js/16a-comment-draft-store.js',
  './js/16b-comment-draft-images.js',
  './js/16c-comment-draft-submit.js',
  './js/16d-comment-draft-events.js',
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
