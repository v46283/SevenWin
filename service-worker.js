
const CACHE_NAME = 'poultry-ledger-v6-1755049138';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Only handle GET
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      // runtime cache for same-origin requests
      try {
        const copy = resp.clone();
        const url = new URL(req.url);
        if (url.origin === location.origin) {
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
        }
      } catch(e) {}
      return resp;
    }).catch(() => cached))
  );
});
