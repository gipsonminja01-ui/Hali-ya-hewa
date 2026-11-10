// RAINWATCH service worker: app inaweza kufunguka hata bila mtandao
const CACHE = 'rainwatch-v1';
const SHELL = ['/', '/index.html', '/style.css', '/script.js', '/stats.js', '/pwa.js', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ramani (tiles) hazihifadhiwi
  if (url.hostname.endsWith('tile.openstreetmap.org')) return;
  // Data ya hali ya hewa na kurasa: mtandao kwanza, kisha cache
  const networkFirst = req.mode === 'navigate' || url.hostname.endsWith('open-meteo.com') || url.hostname.endsWith('nominatim.openstreetmap.org') || url.origin === location.origin;
  if (networkFirst) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
