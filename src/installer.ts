/// <reference no-default-lib="true" />
/// <reference lib="es2020" />
/// <reference lib="DOM" />

// The keyword __service_worker__ and __target__ will be replaced
declare var __service_worker__: string;
declare var __target__: string;
declare var __404_page__: string;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    if (__404_page__)
      navigator.serviceWorker.register("/" + __service_worker__ + "?t=" + __target__ + "&404=" + __404_page__);
    else navigator.serviceWorker.register("/" + __service_worker__ + "?t=" + __target__);
  });
}
