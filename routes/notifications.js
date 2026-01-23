const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de Auth
router.use((req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
});

router.get('/', async (req, res) => {
    try {
        const notifications = await db.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", 
            [req.session.user.id]
        );
        res.render('pages/notifications', { notifications: notifications.rows });
    } catch (err) {
        res.render('pages/notifications', { notifications: [] });
    }
});

// Marcar como lida
router.post('/:id/read', async (req, res) => {
    await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [req.params.id]);
    res.redirect('/notifications');
});

module.exports = router;
