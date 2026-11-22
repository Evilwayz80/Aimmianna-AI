/* Aimmianna 3D service worker — network-first for the app shell, cache-first for
   images/models, never caches /api/ or third-party (Gemini, Spotify, YouTube). */
const VERSION = "aimmianna-3d-v2.1.0";
const SHELL = ["./", "index.html", "styles.css", "app.js", "world3d.js", "vendor/three.module.min.js", "SAYINGS.json", "manifest.webmanifest", "assets/figure/aimmianna_human_fullbody.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf("/api/") !== -1 || url.pathname.endsWith("version.json")) return;
  const isAsset = /\/assets\/|\/vendor\//.test(url.pathname);
  if (isAsset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; })));
    return;
  }
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html"))));
});
