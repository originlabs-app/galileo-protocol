// Galileo Scanner — Service Worker
// Caches previously resolved product pages for offline re-viewing.

const CACHE_NAME = "galileo-scanner-v2";

// Static assets to pre-cache on install
const PRECACHE_URLS = ["/", "/scan", "/manifest.json"];

// Cache-first for static assets, network-first for API calls
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Verification pages (/01/...): network-first, cache fallback for offline
  if (url.pathname.match(/^\/01\/\d+\/21\//)) {
    const cacheKey = `${url.pathname}${url.search}`;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(cacheKey, clone)),
            );
          }
          return response;
        })
        .catch(() => caches.match(cacheKey)),
    );
    return;
  }

  // Static assets: cache-first, network fallback
  if (
    url.origin === self.location.origin &&
    (url.pathname === "/" ||
      url.pathname === "/scan" ||
      url.pathname.startsWith("/_next/") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".json"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone)),
            );
          }
          return response;
        });
        return cached || fetchPromise;
      }),
    );
    return;
  }
});
