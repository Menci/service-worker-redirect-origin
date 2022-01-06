/// <reference no-default-lib="true" />
/// <reference lib="es2020" />
/// <reference lib="WebWorker" />

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

const targetBaseUrl = new URL(sw.location.href).searchParams.get("t");

sw.addEventListener("install", event => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== sw.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Intercept the request of main HTML page and service worker script
  const newUrl = new URL(targetBaseUrl);
  newUrl.pathname += url.pathname.slice(1); // Remove leading "/"
  newUrl.search = url.search;

  event.respondWith(
    (async () => {
      const response = await fetch(newUrl.toString());
      if (!response.ok) {
        // Oops! the service worker CDN may not available now
        // Fallback to the original URL
        return fetch(event.request);
      }

      return response;
    })()
  );
});
