const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Middleware de Autenticação
const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

router.use(requireAuth);

// ROTA DE REDIRECIONAMENTO SEGURO (Corrige o bug do número não sumir)
router.get('/go/:id', async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.session.user.id;

        // 1. Marca como lida no Banco de Dados
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
            [notificationId, userId]
        );

        // 2. Busca o link de destino
        const result = await pool.query(
            "SELECT link FROM notifications WHERE id = $1",
            [notificationId]
        );

        const targetLink = result.rows[0]?.link;

        // 3. Redireciona (Se não tiver link, vai para a lista de notificações)
        if (targetLink && targetLink !== 'null' && targetLink !== '') {
            res.redirect(targetLink);
        } else {
            res.redirect('/notifications');
        }

    } catch (err) {
        console.error("Erro no redirecionamento de notificação:", err);
        res.redirect('/notifications');
    }
});

// Página de todas as notificações
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", 
            [req.session.user.id]
        );
        
        res.render('pages/notifications', { 
            title: 'Minhas Notificações', 
            notifications: result.rows,
            user: req.session.user
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar notificações.' });
    }
});

// API para marcar todas como lidas
router.post('/mark-all-read', async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [req.session.user.id]);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: 'Server error'});
    }
});

// API legada (caso ainda seja usada via fetch direto em algum lugar)
router.post('/mark-read/:id', async (req, res) => {
    try {
        await pool.query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", [req.params.id, req.session.user.id]);
        res.json({success: true});
    } catch (err) {
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;
