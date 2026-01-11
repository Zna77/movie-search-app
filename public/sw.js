const VERSION = "v2";
const STATIC_CACHE = `movie-app-static-${VERSION}`;
const RUNTIME_CACHE = `movie-app-runtime-${VERSION}`;
const IMAGE_CACHE = `movie-app-images-${VERSION}`;

// Assets to precache
const STATIC_ASSETS = ["/", "/index.html", "/style.css", "/script.js", "/sw.js"];

// 1) Precache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(
          STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" }))
        )
      )
      .then(() => self.skipWaiting())
      .catch((err) => console.error("SW install failed:", err))
  );
});

// 2) Cleanup old caches
self.addEventListener("activate", (event) => {
  const keep = [STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp.ok || resp.type === "opaque") cache.put(request, resp.clone());
  return resp;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (resp.ok || resp.type === "opaque") cache.put(request, resp.clone());
    return resp;
  } catch {
    const cached = await cache.match(request);
    return cached || cache.match("/index.html");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((resp) => {
      if (resp.ok || resp.type === "opaque") cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => null);
  const networkResp = await fetchPromise;
  return cached || networkResp || Response.error();
}

// 3) Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Bypass caching for API calls and TMDB API
  if (
    url.pathname.startsWith("/api/") ||
    url.origin.includes("api.themoviedb.org")
  ) {
    return;
  }

  // HTML navigations: network-first so new deploys show up quickly
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // TMDB image caching: cache-first
  if (url.origin === "https://image.tmdb.org") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Fonts: stale-while-revalidate
  if (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Other requests: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
