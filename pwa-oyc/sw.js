const CACHE = 'oyc-cache-v1';
const ASSETS = [
  '/workspace/pwa-oyc/index.html',
  '/workspace/pwa-oyc/app.css',
  '/workspace/pwa-oyc/app.js',
  '/workspace/pwa-oyc/manifest.webmanifest',
  '/workspace/pwa-oyc/assets/icons/icon-192.svg',
  '/workspace/pwa-oyc/assets/icons/icon-512.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(()=> self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k)))).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (ASSETS.includes(url.pathname)){
    e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
    return;
  }
  if (e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return resp;
      }).catch(()=> caches.match('/workspace/pwa-oyc/index.html'))
    );
    return;
  }
  e.respondWith(fetch(e.request).catch(()=> caches.match(e.request)));
});

