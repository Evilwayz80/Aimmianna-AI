/* Aimmianna 3D service worker — network-first for the app shell, cache-first for
   images/models, never caches /api/ or third-party (Gemini, Spotify, YouTube).
   2.4.22 — the iPhone crash fix: model chunk files (.part) live in their own
   PERSISTENT cache ("aimmianna-models"), keyed by full URL (the ?v= query is
   part of the key), and NEVER in the version cache. The version cache is
   deleted on every deploy, so chunks in it meant the first load of a new
   version had a cold cache and had to swallow ~200 MB of models at once —
   iOS killed Safari for memory. Now a new version re-downloads only the
   models whose ?v= changed; the rest stay warm. No file over ~5 MB ever
   goes into the version cache either. */
const VERSION = "aimmianna-3d-v2.4.22";
const MODELS_CACHE = "aimmianna-models";
const MAX_VERSION_CACHE_BYTES = 5 * 1024 * 1024;
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "companion-memory.js", "master-release.js", "master-release-config.js", "world3d.js", "outfits3d.js", "cards.js", "game-updates.js", "assets/cards/m_bunny.webp", "assets/cards/m_mew.webp", "assets/cards/m_pip.webp", "assets/cards/m_coral.webp", "assets/cards/m_ember.webp", "assets/cards/m_lune.webp", "assets/cards/m_raven.webp", "assets/models/outfit3d-mask.png", "vendor/three.module.min.js",
  "SAYINGS.json", "manifest.webmanifest", "assets/figure/aimmianna_human_fullbody.png",
  "life-sim.js", "life-rules.js", "life-figures.js", "life-lessons.js", "life-stories.js", "life-projects.js",
  "life-signals.js", "life-signal-camera.js", "life-signal-sessions.js"
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL))); });
self.addEventListener("activate", (e) => {
  // Old version caches go; the models cache stays — it is persistent by
  // design (its name never starts with "aimmianna-3d-").
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("aimmianna-3d-") && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
function cacheableInVersion(res) {
  if (!res.ok) return false;
  const len = Number(res.headers.get("content-length") || 0);
  return !len || len <= MAX_VERSION_CACHE_BYTES; // unknown length: allow (small shell files); known big files: never
}
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf("/api/") !== -1 || url.pathname.endsWith("version.json")) return;
  // Model chunks: their own persistent cache, keyed by full URL (?v= included).
  if (url.pathname.includes(".part")) {
    e.respondWith(caches.open(MODELS_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()).catch(() => {}); return res; }))));
    return;
  }
  const isAsset = /\/assets\/|\/vendor\//.test(url.pathname);
  if (isAsset) {
    e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (cacheableInVersion(res)) c.put(req, res.clone()).catch(() => {}); return res; }))));
    return;
  }
  e.respondWith(caches.open(VERSION).then((c) => fetch(req).then((res) => {
    if (cacheableInVersion(res)) c.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(async () => await c.match(req) || (req.mode === "navigate" ? await c.match("index.html") : null) || Response.error())));
});
