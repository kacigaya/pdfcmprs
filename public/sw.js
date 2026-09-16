const CACHE = "pdfcmprs-v3";
// "/" on the VPS, "/<repo>/" on a GitHub Pages project site.
const SCOPE = new URL(self.registration.scope).pathname;
const PRECACHE = [SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icon.svg`];

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
      const shell = await cache.match(SCOPE);
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

/**
 * Static hosts such as GitHub Pages cannot send COOP/COEP, and LibreOffice's
 * pthread build refuses to start without SharedArrayBuffer. Re-issue responses
 * with the headers so the page is cross-origin isolated on every load this
 * worker controls. Redirects and errors (status 0) cannot be rebuilt.
 */
function isolate(response) {
  if ([0, 204, 205, 304].includes(response.status)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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

  let response;
  if (navigation || nextData) {
    response = networkFirst(event, navigation);
  } else if (url.pathname.startsWith(`${SCOPE}_next/static/`)) {
    response = cacheFirst(event);
  } else {
    response = staleWhileRevalidate(event);
  }
  event.respondWith(response.then(isolate));
});
