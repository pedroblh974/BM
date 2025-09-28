const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `physics-pwa-${CACHE_VERSION}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/app/app.js',
  '/app/storage.js',
  '/app/router.js',
  '/app/ui.js',
  '/app/utils.js',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, copy);
      });
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});

