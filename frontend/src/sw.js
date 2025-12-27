// Service Worker for Push Notifications and Caching
// ✅ Workbox Injection Point
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

cleanupOutdatedCaches()

// self.__WB_MANIFEST is injected by VitePWA build process
precacheAndRoute(self.__WB_MANIFEST)

console.log('🔧 Service Worker loaded with Workbox');

// Listen for push events from the server
self.addEventListener('push', event => {
    console.log('📬 Push received raw:', event.data ? event.data.text() : 'no payload');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.log('⚠️ Payload is not JSON, treating as text');
            data = {
                title: 'Prueba de Notificación',
                body: event.data.text()
            };
        }
    }

    const options = {
        body: data.body || 'Nueva notificación',
        icon: '/android/android-launchericon-192-192.png', // ✅ corrected path
        badge: '/android/android-launchericon-192-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'restaurante-notification',
        data: {
            url: data.data?.url || '/',
            pedidoId: data.data?.pedidoId,
            ...data.data
        },
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || '🍽️ Restaurante POS',
            options
        )
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Notification clicked:', event.notification.data);

    event.notification.close();

    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // If app is already open, focus it
                for (let client of clientList) {
                    if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise, open new window
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url || '/');
                }
            })
    );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', event => {
    console.log('🔄 Push subscription changed');

    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then(subscription => {
                // Send new subscription to server
                return fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                });
            })
    );
});

console.log('✅ Service Worker ready');
