/*
 * Pulsar service worker: the app opens without a connection and can be installed.
 * Generated at build time by pwa/plugin.ts (the list of files to keep comes from the build).
 *
 * - The app shell (page, main script and styles, icons) is kept on install.
 * - Other files with a hash in their name (assets/, models/) are kept the first time they are used.
 * - Pages: network first, the kept copy when offline.
 * - /api/: always to the network (the app keeps its own copy of the habitat data and waits
 *   to send changes), except NASA DONKI, which falls back to its last answer.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `pulsar-shell-${VERSION}`;
const RUNTIME = 'pulsar-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pulsar-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone());
    return response;
  } catch (error) {
    const kept = (await cache.match(fallbackUrl ?? request)) ?? (await caches.match(fallbackUrl ?? request));
    if (kept) return kept;
    throw error;
  }
}

async function cacheFirst(request) {
  const kept = await caches.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok) (await caches.open(RUNTIME)).put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/donki/')) {
    event.respondWith(networkFirst(request, RUNTIME));
    return;
  }
  if (url.pathname.startsWith('/api/') || url.pathname.endsWith('.mp4')) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/index.html'));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/models/')) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(caches.match(request).then((kept) => kept ?? fetch(request)));
});
