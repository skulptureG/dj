// DJ:Request Service Worker
// Strategy: network-first for everything.
// Firebase, Google APIs and CDN scripts are NEVER cached —
// this preserves all real-time sync functionality.

const CACHE_NAME   = 'djrequest-v1';
const NEVER_CACHE  = [
  'firebasejs',
  'googleapis.com',
  'gstatic.com',
  'firebaseio.com',
  'firebaseapp.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'itunes.apple.com',
  'beatport.com',
  'spotify.com',
];

// Only cache the core app shell files
const APP_SHELL = [
  './index.html',
  './manifest.json',
];

// ─── INSTALL: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ─── ACTIVATE: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH: network-first for everything
// Never cache Firebase or external API calls
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Never intercept Firebase / CDN / API traffic
  if (NEVER_CACHE.some(pattern => url.includes(pattern))) return;

  // Network-first for everything else
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Only cache successful same-origin responses
        if (
          response.ok &&
          response.type === 'basic' &&
          url.startsWith(self.location.origin)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Network failed — try cache as fallback (offline only)
        caches.match(e.request).then(cached => cached || Response.error())
      )
  );
});
