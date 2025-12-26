// Service Worker for Push Notifications
// This runs in the background even when the app is closed

console.log('🔧 Service Worker loaded');

// Listen for push events from the server
self.addEventListener('push', event => {
    console.log('📬 Push received:', event);

    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'Nueva notificación del restaurante',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'restaurante-notification',
        data: {
            url: data.url || '/',
            pedidoId: data.pedidoId,
            ...data.data
        },
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is open and visible
                const isAppVisible = clientList.some(client =>
                    client.url.includes(self.registration.scope) &&
                    'visibilityState' in client &&
                    client.visibilityState === 'visible'
                );

                // Assuming in-app notifications (Toast) handle the visible case,
                // we suppress the system notification if app is visible.
                if (isAppVisible) {
                    console.log('👀 App is visible, suppressing system notification');
                    return;
                }

                return self.registration.showNotification(
                    data.title || '🍽️ Restaurante POS',
                    options
                );
            })
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
