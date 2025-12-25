const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const requireAuth = (req, res, next) => { if (!req.session.user) return res.redirect('/auth/login'); next(); };

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/articles', { 
            title: 'Blog & Dicas', 
            articles: result.rows, 
            user: req.session.user, 
            currentPage: 'articles',
            csrfToken: res.locals.csrfToken
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao carregar artigos.' }); }
});

router.get('/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        
        // --- LIMPEZA DE NOTIFICAÇÃO ---
        // Se o usuário entra no artigo, marca a notificação correspondente como lida
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND link = $2",
            [req.session.user.id, `/articles/${articleId}`]
        );

        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [articleId]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        
        res.render('pages/article-details', { 
            title: result.rows[0].title, 
            article: result.rows[0], 
            user: req.session.user, 
            currentPage: 'articles',
            csrfToken: res.locals.csrfToken
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao carregar artigo.' }); }
});

module.exports = router;
