/* Napi edzés – service worker (offline cache). Relatív útvonalak: bármely almappából működik. */
const VERSION = '2.5.0';
const CACHE = 'napi-edzes-' + VERSION;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/fonts.css',
  'css/style.css',
  'css/neon.css',
  'js/figure.js',
  'js/figure3d.js',
  'icons/char-neon.webp',
  'icons/char-shade.webp',
  'icons/char-katana.webp',
  'icons/char-ronin.webp',
  'models/motions/squat.glb',
  'models/motions/pushup.glb',
  'models/motions/burpee.glb',
  'models/motions/jab.glb',
  'models/motions/jacks.glb',
  'models/motions/squatbent.glb',
  'models/motions/swing.glb',
  'models/neon.glb',
  'models/ronin.glb',
  'models/shade.glb',
  'models/katana.glb',
  'js/data.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'fonts/press-start-2p-latin-400-normal.woff2',
  'fonts/press-start-2p-latin-ext-400-normal.woff2',
  'fonts/vt323-latin-400-normal.woff2',
  'fonts/vt323-latin-ext-400-normal.woff2'
];

// Az index.html teljes URL-je (a SW helyéhez viszonyítva).
const INDEX_URL = new URL('index.html', self.location).href;

// Telepítés: minden fájl előtöltése; a HTTP-gyorsítótárat megkerüljük (cache: 'reload').
// skipWaiting-et NEM hívunk – az oldal dönti el, mikor frissüljön (SKIP_WAITING üzenet).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
});

// Aktiválás: régi verziójú gyorsítótárak törlése, majd a kliensek átvétele.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('napi-edzes-') && k !== CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Üzenetek az oldaltól.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'GET_VERSION') {
    const reply = { type: 'VERSION', version: VERSION };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source && event.source.postMessage) event.source.postMessage(reply);
  }
});

function offlineResponse() {
  return new Response('Offline – a tartalom nem érhető el.', {
    status: 504,
    statusText: 'Gateway Timeout',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// Lekérések: csak azonos eredetű GET; minden más a böngészőre marad.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigáció: cache-first – mindig a gyorsítótárazott index.html (egyoldalas app).
  if (req.mode === 'navigate') {
    // Csak a gyökér és az index.html kapja az appot; mélyebb útvonalról vissza a gyökérre,
    // különben a relatív fájlútvonalak rossz helyre mutatnának.
    const scope = self.registration.scope;
    if (url.href.split(/[?#]/)[0] !== scope && url.href.split(/[?#]/)[0] !== INDEX_URL) {
      event.respondWith(Response.redirect(scope, 302));
      return;
    }
    event.respondWith((async () => {
      const cached = await caches.match(INDEX_URL, { ignoreSearch: true });
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch (err) {
        return (await caches.match(INDEX_URL, { ignoreSearch: true })) || offlineResponse();
      }
    })());
    return;
  }

  // Egyéb erőforrások: cache-first, különben hálózat (+ mentés a gyorsítótárba).
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      return offlineResponse();
    }
  })());
});
