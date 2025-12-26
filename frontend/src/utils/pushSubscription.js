// Push Notification Subscription Utility

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Subscribe to push notifications
 * @param {string} userId - User ID
 * @param {string} role - User role (mesero, cocinero, cajero, admin)
 * @returns {Promise<PushSubscription|null>}
 */
export async function subscribeToPush(userId, role) {
    try {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return null;
        }

        // Check if Service Worker is supported
        if (!('serviceWorker' in navigator)) {
            console.warn('Browser does not support Service Workers');
            return null;
        }

        // Request permission if not granted
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            console.log('❌ Notification permission denied');
            return null;
        }

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID public key from environment
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('❌ VAPID public key not configured');
            return null;
        }

        // Subscribe to push manager
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('✅ Push subscription created:', subscription.endpoint);

        // Send subscription to backend
        const token = localStorage.getItem('token');
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userId,
                role
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription to server');
        }

        console.log('✅ Push subscription saved to server');
        return subscription;

    } catch (error) {
        console.error('❌ Push subscription error:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications
 * @returns {Promise<boolean>}
 */
export async function unsubscribeFromPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            // Remove from backend
            const token = localStorage.getItem('token');
            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            console.log('✅ Unsubscribed from push notifications');
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Unsubscribe error:', error);
        return false;
    }
}

/**
 * Check if user is currently subscribed
 * @returns {Promise<boolean>}
 */
export async function isPushSubscribed() {
    try {
        if (!('serviceWorker' in navigator)) return false;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        return subscription !== null;
    } catch (error) {
        return false;
    }
}
