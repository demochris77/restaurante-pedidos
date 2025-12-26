import webpush from 'web-push';
import pool from '../config/db.js';
import { t } from './translations.js';

// Configure VAPID details
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@restaurante.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * Send push notification to all users with a specific role
 * @param {string} role - User role (mesero, cocinero, cajero, admin)
 * @param {string} titleKey - Translation key for title
 * @param {string} bodyKey - Translation key for body  
 * @param {array} bodyParams - Parameters for body template
 * @param {object} data - Additional data
 */
export async function sendPushToRole(role, titleKey, bodyKey, bodyParams = [], data = {}) {
    try {
        // Get all subscriptions for this role with user language
        const result = await pool.query(
            `SELECT ps.*, u.language 
       FROM push_subscriptions ps
       LEFT JOIN usuarios u ON ps.user_id = u.id
       WHERE ps.role = $1`,
            [role]
        );

        if (result.rows.length === 0) {
            console.log(`ℹ️  No push subscriptions found for role: ${role}`);
            return;
        }

        console.log(`📤 Sending push to ${result.rows.length} ${role}(s)`);

        // Send to all subscriptions
        const promises = result.rows.map(async (sub) => {
            const subscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.keys_p256dh,
                    auth: sub.keys_auth
                }
            };

            // Get user's language preference (default to Spanish)
            const userLang = sub.language || 'es';

            // Translate title and body
            const title = t(titleKey, userLang);
            const body = Array.isArray(bodyParams)
                ? t(bodyKey, userLang, ...bodyParams)
                : t(bodyKey, userLang);

            const payload = JSON.stringify({
                title,
                body,
                data: {
                    url: data.url || '/',
                    ...data
                },
                tag: data.tag || 'restaurante-notification',
                requireInteraction: data.requireInteraction || false
            });

            try {
                await webpush.sendNotification(subscription, payload);
                console.log(`✅ Push sent to ${sub.user_id} (${userLang}): ${title}`);
            } catch (err) {
                console.error(`❌ Push failed for ${sub.user_id}:`, err.message);

                // If subscription is invalid (410 Gone), remove it
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`🗑️  Removing invalid subscription for ${sub.user_id}`);
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        });

        await Promise.all(promises);

    } catch (error) {
        console.error('❌ Push notification error:', error);
    }
}

/**
 * Send push notification to a specific user
 * @param {string} userId - User ID
 * @param {string} titleKey - Translation key for title
 * @param {string} bodyKey - Translation key for body
 * @param {array} bodyParams - Parameters for body template
 * @param {object} data - Additional data
 */
export async function sendPushToUser(userId, titleKey, bodyKey, bodyParams = [], data = {}) {
    try {
        // Get all subscriptions for this user with language
        const result = await pool.query(
            `SELECT ps.*, u.language 
       FROM push_subscriptions ps
       LEFT JOIN usuarios u ON ps.user_id = u.id
       WHERE ps.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            console.log(`ℹ️  No push subscriptions found for user: ${userId}`);
            return;
        }

        // Get user's language (should be same for all subscriptions of same user)
        const userLang = result.rows[0].language || 'es';

        // Translate title and body
        const title = t(titleKey, userLang);
        const body = Array.isArray(bodyParams)
            ? t(bodyKey, userLang, ...bodyParams)
            : t(bodyKey, userLang);

        const payload = JSON.stringify({
            title,
            body,
            data: {
                url: data.url || '/',
                ...data
            },
            tag: data.tag || 'restaurante-notification',
            requireInteraction: data.requireInteraction || false
        });

        console.log(`📤 Sending push to user ${userId} (${userLang}): ${title}`);

        // Send to all user's subscriptions
        const promises = result.rows.map(async (sub) => {
            const subscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.keys_p256dh,
                    auth: sub.keys_auth
                }
            };

            try {
                await webpush.sendNotification(subscription, payload);
                console.log(`✅ Push sent to ${userId}`);
            } catch (err) {
                console.error(`❌ Push failed for ${userId}:`, err.message);

                // If subscription is invalid, remove it
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`🗑️  Removing invalid subscription`);
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        });

        await Promise.all(promises);

    } catch (error) {
        console.error('❌ Push notification error:', error);
    }
}
