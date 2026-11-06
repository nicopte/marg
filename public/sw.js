const CACHE_NAME = 'mi-argentina-v1';

// Files to pre-cache for offline support
const PRE_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.svg',
  '/arg_front_new_bg.webp',
  '/arg_back_new_bg.webp',
  '/dorso.png',
  '/barcode_relleno_final.png',
  '/sample_dniphoto.png',
  '/sample_signature.png',
  '/card-mundial.png',
  '/card-turnos.png',
  '/icons/logo-CASA.png',
  '/icons/logo-NOVEDADES.png',
  '/icons/logo-TELEFONO.png',
  '/icons/logo-USUARIO.png',
  '/icons/logo-ojo.png',
  '/icons/logo-X.png',
  '/icons/logo-QR.png',
  '/icons/serv-tramites.png',
  '/icons/serv-vehiculos.png',
  '/icons/serv-trabajo.png',
  '/icons/serv-salud.png',
  '/icons/serv-cobros.png',
  '/icons/serv-documentos.png',
  '/icons/serv-turnos.png',
  '/icons/serv-hijos.png',
];

// Install: pre-cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first for static assets (images, fonts, etc.)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|otf|woff2|css|js)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for pages (HTML)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});
