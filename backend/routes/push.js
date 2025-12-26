import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// POST /api/push/subscribe - Save push subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { subscription, userId, role } = req.body;

        if (!subscription || !userId || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Extract keys from subscription
        const endpoint = subscription.endpoint;
        const p256dh = subscription.keys.p256dh;
        const auth = subscription.keys.auth;

        // Save or update subscription
        await pool.query(`
            INSERT INTO push_subscriptions (user_id, role, endpoint, keys_p256dh, keys_auth, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, endpoint) 
            DO UPDATE SET 
                keys_p256dh = $4, 
                keys_auth = $5,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, role, endpoint, p256dh, auth]);

        console.log(`✅ Push subscription saved for user ${userId} (${role})`);
        res.json({ success: true, message: 'Subscription saved' });

    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/push/unsubscribe - Remove push subscription
router.post('/unsubscribe', async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint required' });
        }

        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);

        console.log(`✅ Push subscription removed: ${endpoint}`);
        res.json({ success: true, message: 'Subscription removed' });

    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/push/test - Test push notification (for debugging)
router.get('/test', async (req, res) => {
    try {
        const { sendPushToRole } = await import('../utils/pushNotifications.js');

        await sendPushToRole('cocinero',
            '🧪 Test Notification',
            'This is a test push notification',
            { url: '/' }
        );

        res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
        console.error('Push test error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
