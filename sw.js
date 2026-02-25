// Service Worker — cache app shell for fast load & offline splash
const CACHE = 'meetrec-v1';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/icon-192.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-first for API calls; cache-first for app shell
  if (e.request.url.includes('/api/') || e.request.url.includes('anthropic') || e.request.url.includes('openai')) {
    return; // bypass — don't cache API calls
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
