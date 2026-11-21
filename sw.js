/* Aimmianna iPhone PWA v1.0 — service worker.
   Cache-first for the app shell and local assets so the app still opens
   and talks (canned lines) with no connection.

   HONEST iOS LIMITS (read before promising anything):
   - iOS Safari supports service workers only from iOS 11.3+, and only
     while the app is installed / opened in Safari. Cache storage on iOS
     is capped (roughly 50 MB per origin in practice) and the OS can evict
     it under storage pressure — the optimized asset set is ~10.1 MB, so
     the whole app now fits comfortably, but the shell (HTML/CSS/JS/
     SAYINGS.json/base figure/icons) is cached first and is the priority;
     wardrobe variants are cached best-effort and fall back to the network
     when evicted.
   - Push notifications are NOT supported for web apps on iOS in any
     useful form for this app; bedtime/alarm reminders only fire while
     the app is open (see app.js).
   - The worker only runs when the app is served over https (or
     localhost). Opening index.html from file:// registers nothing. */
const CACHE = "aimmianna-pwa-v1";
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "SAYINGS.json",
  "manifest.webmanifest",
  "assets/figure/aimmianna_human_fullbody.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/apple-touch-icon.png",
  "assets/audio/greeting.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only handle same-origin GETs — AI/TTS API calls go straight to the network.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache good same-origin responses for next time (best-effort:
        // a full wardrobe PNG that won't fit just won't be stored).
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        // Offline and not cached: the shell still works from cache;
        // an uncached wardrobe image simply fails to load and the
        // <img> onerror path in the page keeps the base figure.
        return cached || Response.error();
      });
    })
  );
});
