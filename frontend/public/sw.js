const CACHE_NAME = 'restaurante-v1';
const OFFLINE_URL = '/';

// Assets a cachear al instalar
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker instalándose...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((err) => {
                console.error('Error en install:', err);
            })
    );

    self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activándose...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('Borrando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
    );

    self.clients.claim();
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo cachear requests GET y que sean http/https
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // Estrategia diferente según el tipo de recurso
    if (url.pathname.startsWith('/api/')) {
        // Para API: intentar red primero, luego cache
        event.respondWith(networkFirst(request));
    } else {
        // Para assets: cache primero, luego red
        event.respondWith(cacheFirst(request));
    }
});

// Estrategia: Cache First (para assets estáticos)
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        console.log('Cache hit:', request.url);
        return cached;
    }

    try {
        const response = await fetch(request);

        // Cache la respuesta si es exitosa
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (err) {
        console.warn('Fetch falló:', request.url, err);

        // Devolver offline page si no hay cache
        if (request.destination === 'document') {
            return cache.match(OFFLINE_URL);
        }

        return new Response('Offline - Recurso no disponible', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// Estrategia: Network First (para API)
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);

        // Cache la respuesta si es exitosa
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (err) {
        console.warn('Network falló, intentando cache:', request.url);

        const cached = await cache.match(request);

        if (cached) {
            console.log('Cache hit (fallback):', request.url);
            return cached;
        }

        // Si no hay cache, devolver error
        return new Response(
            JSON.stringify({
                error: 'Sin conexión. Datos no disponibles en caché.',
                offline: true
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            }
        );
    }
}

// Sincronización en background cuando vuelva la conexión
self.addEventListener('sync', (event) => {
    console.log('Background sync:', event.tag);

    if (event.tag === 'sync-pedidos') {
        event.waitUntil(
            // Aquí irían las llamadas API pendientes
            Promise.resolve()
        );
    }
});

// Notificaciones push (opcional)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Nuevo pedido',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [100, 50, 100],
        tag: 'pedido-notificacion',
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification('🍽️ Restaurante POS', options)
    );
});
