const CACHE_NAME = 'tradesync-v13';
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
  './css/12-readiness-workflow-1.css',
  './css/12-readiness-workflow-2.css',
  './css/12-readiness-workflow-3.css',
  './css/12-readiness-workflow-4.css',
  './css/13-priority-progress-rollup.css',
  './css/14-p6-schedule-sync.css',
  './css/15-create-building.css',
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
  './js/17a1-readiness-data.js',
  './js/17a2-readiness-engine.js',
  './js/17b1-readiness-screens.js',
  './js/17b2-impact-gate-ui.js',
  './js/17b3-quick-update-ui.js',
  './js/17c1-handoff-impact-actions.js',
  './js/17c2-quick-update-actions.js',
  './js/18-priority-progress-rollup.js',
  './js/19a1-p6-xer-parser.js',
  './js/19a2-p6-xml-parser.js',
  './js/19a3-p6-csv-file.js',
  './js/19b1-p6-mapping.js',
  './js/19b2-p6-task-constraint.js',
  './js/19b3-p6-gate-handoff.js',
  './js/19b4-p6-backup.js',
  './js/19b5-p6-apply.js',
  './js/19c1-p6-panels.js',
  './js/19c2-p6-modals.js',
  './js/19c3-p6-events.js',
  './js/20-create-building.js',
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
