const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

router.post('/mark-read/:id', async (req, res) => {
    if (!req.session.user) return res.status(403).json({error: 'Unauthorized'});
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [req.params.id, req.session.user.id]);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: 'Server error'});
    }
});

router.post('/mark-all-read', async (req, res) => {
    if (!req.session.user) return res.status(403).json({error: 'Unauthorized'});
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [req.session.user.id]);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;
