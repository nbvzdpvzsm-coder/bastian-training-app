const CACHE_NAME = "training-app-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./main.js",
  "./data.js",
  "./store.js",
  "./progression.js",
  "./utils.js",
  "./chart.js",
  "./timer.js",
  "./views_train.js",
  "./views_dashboard.js",
  "./views_body.js",
  "./views_history.js",
  "./views_settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first für die App selbst: Wer online ist (z. B. zu Hause), bekommt sofort den neuesten Stand
// nach Plan-Anpassungen statt erst nach zweimaligem Neuladen. Offline (z. B. unterwegs) greift der Cache,
// damit die App immer nutzbar bleibt.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
