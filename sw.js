const CACHE_NAME = "movie-app-v1";

// List of assets to pre-cache (use relative paths within the SW scope)
const STATIC_ASSETS = [
  "./", // root of the app
  "./index.html", // homepage
  "./style.css", // CSS
  "./script.js", // main JS
  "./sw.js", // Service Worker script
];

// 1. Pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error("SW install failed:", err))
  );
});

// 2. Clean up old caches
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
  );
});

// 3. Runtime caching for images and API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 3a. TMDB images – Cache First
  if (url.origin === "https://image.tmdb.org") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, resp.clone());
              return resp;
            });
          })
      )
    );
    return;
  }

  // 3b. API calls – Network First with fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3c. Other navigation/static – Cache First
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
