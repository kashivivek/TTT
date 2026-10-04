// Bump when changing caching rules so old caches are dropped.
const CACHE_NAME = "ttt-v2";
const PRECACHE_URLS = ["/offline.html", "/logo.png", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only immutable, same-origin static assets are cached. API responses and
// Supabase data (which can be personal) are never stored.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo.png"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
  }
});

// Pushes are sent without a payload; the message is fetched using the
// subscription endpoint as an unguessable key.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = null;
      try {
        if (event.data) payload = event.data.json();
      } catch {
        payload = null;
      }
      if (!payload) {
        try {
          const sub = await self.registration.pushManager.getSubscription();
          if (sub) {
            const res = await fetch(`/api/push/pending?endpoint=${encodeURIComponent(sub.endpoint)}`, { cache: "no-store" });
            if (res.ok) payload = await res.json();
          }
        } catch {
          payload = null;
        }
      }
      const title = (payload && payload.title) || "New episodes are out";
      const body = (payload && payload.body) || "Shows you track have new episodes today.";
      const url = (payload && payload.url) || "/dashboard";
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url },
        tag: "ttt-new-episodes",
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
