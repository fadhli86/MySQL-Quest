// Service worker: lets the game open when the network is flaky or gone.
//
// - Same-origin files (HTML/CSS/JS modules): NETWORK-FIRST with a short
//   timeout, falling back to the cached copy. Freshness wins whenever the
//   network works, so a redeploy is never masked by stale modules (the app
//   is a chain of ES modules — mixing old and new files could break it).
// - jsDelivr assets (CodeMirror, sql.js + its .wasm, QR generator): these
//   URLs are version-pinned, so CACHE-FIRST is safe and makes them survive
//   a blocked/slow CDN after the first successful visit.
//
// Nothing is precached: the cache fills as the app is used, so a student
// must have opened the game once online. Progress lives in localStorage and
// is unaffected by this file.
const VERSION = "v1";
const APP_CACHE = `mysqlquest-app-${VERSION}`;
const CDN_CACHE = `mysqlquest-cdn-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([APP_CACHE, CDN_CACHE]);
      for (const key of await caches.keys()) if (key.startsWith("mysqlquest-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("network timeout")), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = (await cache.match(request)) || (request.mode === "navigate" ? await cache.match("./index.html") : null);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CDN_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
  else if (url.hostname === "cdn.jsdelivr.net") event.respondWith(cacheFirst(request));
});
