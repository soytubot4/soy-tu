/**
 * Service worker: el sitio se baja una vez y después abre instantáneo.
 *
 * Estrategia: stale-while-revalidate. Se sirve lo que está en caché (por eso la
 * segunda visita es inmediata y anda sin conexión) y en paralelo se pide la
 * versión nueva para la próxima vez. Nunca se deja al visitante esperando la red
 * para ver algo que ya tenía.
 *
 * El nombre del caché lleva versión: cuando se publica una versión nueva del
 * sitio, se cambia y el `activate` borra las viejas. Sin eso, un visitante podría
 * quedarse con la web de hace seis meses para siempre.
 */
const CACHE = "soytu-v2";

self.addEventListener("install", (event) => {
  // Sin waitUntil de precarga: el HTML y los assets entran solos en el primer
  // fetch. Precargar una lista fija de archivos obliga a mantenerla a mano y se
  // rompe callada en cuanto cambia un hash del build.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET y solo de este dominio: los links a los otros productos y el mailto
  // no tienen por qué pasar por acá.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cacheado = await cache.match(req);

      const red = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      // Si hay algo cacheado, va eso ya. Si no, se espera la red.
      const res = cacheado || (await red);
      if (res) return res;

      // Sin caché y sin red: si pedían una página, se devuelve la home, que es
      // lo único que tiene este sitio.
      if (req.mode === "navigate") {
        const home = await cache.match("/");
        if (home) return home;
      }
      return new Response("Sin conexión", { status: 503, statusText: "Sin conexión" });
    })(),
  );
});
