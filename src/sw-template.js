/* Carnet de Route service worker: keeps the app usable without network.
 * Generated at build time by vite.config.ts (PRECACHE and VERSION are injected). */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const APP_CACHE = `carnet-app-${VERSION}`;
const FONT_CACHE = 'carnet-fonts';
const TILE_CACHE = 'carnet-tiles';
const MAX_TILES = 600;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('carnet-app-') && k !== APP_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(cacheName, request, onStore) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(request, response.clone());
    if (onStore) onStore();
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Gemini suggestions always need the network.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // App pages: answer from the cache instantly (works with no or weak signal).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .match('/index.html', { cacheName: APP_CACHE })
        .then((cached) => cached || fetch(request))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(APP_CACHE, request));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(FONT_CACHE, request));
    return;
  }

  // Map tiles already viewed stay available offline.
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(
      cacheFirst(TILE_CACHE, request, () => trimCache(TILE_CACHE, MAX_TILES)).catch(
        () => new Response('', { status: 504 })
      )
    );
  }
});
