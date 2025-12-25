const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Middleware para garantir autenticação
const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

router.use(requireAuth);

// Página de todas as notificações
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", 
            [req.session.user.id]
        );
        
        // Renderiza a página (vamos criar o arquivo notifications.ejs a seguir)
        res.render('pages/notifications', { 
            title: 'Minhas Notificações', 
            notifications: result.rows,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar notificações.' });
    }
});

router.post('/mark-read/:id', async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [req.params.id, req.session.user.id]);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: 'Server error'});
    }
});

router.post('/mark-all-read', async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [req.session.user.id]);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;
