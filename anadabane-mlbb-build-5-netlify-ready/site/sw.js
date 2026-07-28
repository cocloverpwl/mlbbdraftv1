self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      await self.clients.claim();

      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });
      await Promise.all(
        clientList.map((client) => {
          const url = new URL(client.url);
          url.searchParams.set("updated", "5");
          return client.navigate(url.href);
        })
      );
    })()
  );
});
