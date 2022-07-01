/// <reference no-default-lib="true" />
/// <reference lib="es2021" />
/// <reference lib="WebWorker" />

const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

const query = new URL(sw.location.href).searchParams;
const targetBaseUrl = query.get("t");
const _404Page = query.get("404");

if (!Promise.any) {
  Promise.any = <T>(promises: Iterable<T | Promise<T>>): Promise<Awaited<T>> => {
    return Promise.all(
      [...promises].map(promise => {
        return new Promise((resolve, reject) =>
          Promise
            .resolve(promise)
            // When a promise fulfilled, we call reject to bail out Promise.all
            // When a promise rejected, we call resolve to continue Promise.all
            .then(reject, resolve)
        );
      })
    ).then(
      // The resolved are actually aggregated errors
      errors => Promise.reject(errors),
      // The reject is the first fulfilled promise (which causes the bail out)
      fastest => Promise.resolve<Awaited<T>>(fastest)
    )
  }
}

sw.addEventListener("install", event => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== sw.origin) {
    return;
  }


  let abortController: AbortController | undefined;
  if (typeof AbortController === "function") {
    abortController = new AbortController();
  }

  const fetchOrigin = async (signal?: AbortSignal) => {
    const resp = await fetch(event.request, { signal });
    abortController?.abort();
    return resp;
  };
  const fetchRedirected = async (signal?: AbortSignal) => {
    const newUrl =
      targetBaseUrl +
      url.pathname.slice(1) + // Remove leading "/"
      url.search;

    // Handle redirects like "https://cdn/path" to "https://cdn/path/"
    // NOTE: or return a transformed redirect response?
    const fetchOptions: RequestInit = {
      redirect: "follow",
      signal
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

    abortController?.abort();
    return response;
  }

  event.respondWith(
    Promise.any([fetchOrigin(abortController?.signal), fetchRedirected(abortController?.signal)])
  );
});
