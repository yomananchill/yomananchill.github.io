/* Tombstone service worker.

   The previous Jekyll (Chirpy) site at this origin was a PWA and registered a
   worker that serves cache-first. Deleting the repository does not remove it:
   it stays installed in every browser that ever visited, and keeps serving the
   old site. Browsers do re-fetch the worker script, so replacing it with this
   one is what actually evicts it.

   Installs, clears every cache, unregisters itself, then reloads open tabs. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })()
  );
});

/* Never serve from cache while this is alive. */
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
