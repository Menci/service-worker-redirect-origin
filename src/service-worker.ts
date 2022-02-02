/// <reference no-default-lib="true" />
/// <reference lib="es2020" />
/// <reference lib="WebWorker" />

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

const query = new URL(sw.location.href).searchParams;
const targetBaseUrl = query.get("t");
const _404Page = query.get("404");

sw.addEventListener("install", event => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== sw.origin) {
    return;
  }

  // Intercept the request
  const newUrl =
    targetBaseUrl +
    url.pathname.slice(1) + // Remove leading "/"
    url.search;

  const fetchOptions: RequestInit = {
    redirect: "follow"
  };

  event.respondWith(
    (async () => {
      let response = await fetch(newUrl, fetchOptions);
      if (response.status === 404 && _404Page) {
        response = await fetch(targetBaseUrl + _404Page, fetchOptions);
      }

      if (!response.ok) {
        // Oops! the service worker CDN may not available now
        // Fallback to the original URL
        return fetch(event.request, fetchOptions);
      }

      return response;
    })()
  );
});
