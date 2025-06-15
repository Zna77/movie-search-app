const CACHE_NAME = "movie-app-v1";
const STATIC_ASSETS = [
  "/", // your index.html
  "/style.css",
  "/script.js",
  "/favicon.ico", // any other static files
];

// 1. Pre‐cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
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

// 3. Runtime caching for everything else (API + images)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 3a. TMDB images – Cache First
  if (url.origin === "https://image.tmdb.org") {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((resp) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, resp.clone());
              return resp;
            });
          })
      )
    );
    return;
  }

  // 3b. API calls – Network First (so you always get latest, but fallback to cache when offline)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          // update cache
          const copy = resp.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3c. Other navigation/static – Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
