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

  function fetchOrigin() {
    return fetch(event.request);
  }

  async function fetchRedirected() {
    const newUrl =
      targetBaseUrl +
      url.pathname.slice(1) + // Remove leading "/"
      url.search;

    // Handle redirects like "https://cdn/path" to "https://cdn/path/"
    // NOTE: or return a transformed redirect response?
    const fetchOptions: RequestInit = {
      redirect: "follow"
    };

    let response = await fetch(newUrl, fetchOptions);

    // Handle 404 for static sites
    if (response.status === 404 && _404Page) {
      response = await fetch(targetBaseUrl + _404Page, fetchOptions);
    }

    if (!response.ok) {
      // Oops! the service worker CDN may not available now
      // Fallback to the original URL

      // This error won't be used, just to indicate the fetch failed
      throw null;
    }

    return response;
  }

  // Return the first resolved promise's value,
  // or the [0]'s error if all rejected
  function race(promises: Promise<Response>[]): Promise<Response> {
    let rejectedCount = 0;
    const errors = new Array<Error>(promises.length);
    return new Promise((resolve, reject) =>
      promises.forEach((promise, i) =>
        promise.then(resolve).catch(e => {
          errors[i] = e;
          if (++rejectedCount === promises.length) reject(errors[0]);
        })
      )
    );
  }

  event.respondWith(race([fetchOrigin(), fetchRedirected()]));
});
