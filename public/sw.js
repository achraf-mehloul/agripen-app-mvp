// AgriPen Service Worker — offline shell + runtime caches + push
// Registered only in production by src/lib/pwa-register.ts

const VERSION = "agripen-v5";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const TILES_CACHE = `${VERSION}-tiles`;
const HTML_CACHE = `${VERSION}-html`;

const SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];

// -------- install: precache app shell --------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

// -------- activate: evict old versions --------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// -------- fetch: routing strategies --------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never touch auth / RPC / API — always network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/~oauth") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    url.hostname.includes("lovable.dev")
  ) return;

  // Map tiles (OSM / Esri satellite / NDVI) — cache-first
  if (
    url.hostname.includes("tile.openstreetmap.org") ||
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("server.arcgisonline.com") ||
    url.hostname.includes("tiles.stadiamaps.com") ||
    url.hostname.includes("services.sentinel-hub.com") ||
    url.hostname.includes("tiles.maps.eox.at") ||
    url.hostname.includes("gibs.earthdata.nasa.gov")
  ) {
    event.respondWith(cacheFirst(TILES_CACHE, req, 400));
    return;
  }

  // Fonts / static images — cache-first
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(RUNTIME_CACHE, req, 120));
    return;
  }

  // HTML navigations — network-first w/ offline fallback
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstHTML(req));
    return;
  }

  // Hashed JS/CSS chunks — stale-while-revalidate
  if (url.origin === self.location.origin && /\.(js|css|mjs)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(RUNTIME_CACHE, req));
    return;
  }
});

async function cacheFirst(cacheName, req, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) { cache.put(req, res.clone()); trimCache(cacheName, maxEntries); }
    return res;
  } catch { return hit || Response.error(); }
}

async function staleWhileRevalidate(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetching = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetching;
}

async function networkFirstHTML(req) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put("/", res.clone());
    return res;
  } catch {
    const cached = (await cache.match("/")) || (await caches.match("/"));
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
  }
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
  }
}

// -------- Push notifications --------
self.addEventListener("push", (event) => {
  let payload = { title: "AgriPen", body: "لديك تنبيه جديد", url: "/" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      dir: "rtl", lang: "ar",
      tag: payload.tag || "agripen",
      data: { url: payload.url || "/" },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) if ("focus" in c) { c.navigate(url); return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});

// Allow the app to force an SW update via postMessage
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
