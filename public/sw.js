const CACHE_NAME = "movie-app-v1";

// Assets to precache
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./sw.js",
];

// 1) Precache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error("SW install failed:", err))
  );
});

// 2) Cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3) Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 3a) Bypass caching for API calls and TMDB API
  if (
    url.pathname.startsWith("/api/") ||
    url.origin.includes("api.themoviedb.org")
  ) {
    // Let the browser handle it (network-only)
    return;
  }

  // 3b) TMDB image caching: cache-first
  if (url.origin === "https://image.tmdb.org") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  // 3c) Other assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
