const CACHE = "pdfcmprs-v2";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pdfcmprs-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function cacheResponse(event, responsePromise) {
  const update = Promise.all([caches.open(CACHE), responsePromise]).then(
    ([cache, response]) => {
      if (response.ok) return cache.put(event.request, response.clone());
    },
  );
  event.waitUntil(update.catch(() => {}));
}

function networkFirst(event, navigation) {
  const response = fetch(event.request);
  cacheResponse(event, response);
  return response.catch(async (error) => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    if (navigation) {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    throw error;
  });
}

function cacheFirst(event) {
  const cache = caches.open(CACHE);
  const cached = cache.then((store) => store.match(event.request));
  const response = cached.then((match) =>
    match ? undefined : fetch(event.request),
  );
  const update = Promise.all([cache, response]).then(([store, network]) => {
    if (network?.ok) return store.put(event.request, network.clone());
  });
  event.waitUntil(update.catch(() => {}));
  return Promise.all([cached, response]).then(
    ([match, network]) => match || network,
  );
}

function staleWhileRevalidate(event) {
  const response = fetch(event.request);
  cacheResponse(event, response);
  return caches
    .open(CACHE)
    .then((cache) => cache.match(event.request))
    .then((cached) => cached || response);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== location.origin ||
    request.headers.has("Range")
  ) {
    return;
  }

  const navigation = request.mode === "navigate";
  const nextData =
    request.headers.has("RSC") || url.searchParams.has("_rsc");

  if (navigation || nextData) {
    event.respondWith(networkFirst(event, navigation));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event));
  } else {
    event.respondWith(staleWhileRevalidate(event));
  }
});
