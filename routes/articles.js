const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

// Middleware para verificar se é admin/trainer
const requireEditor = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/articles');
};

router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/articles', { title: 'Blog & Dicas', articles: result.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar artigos.' });
    }
});

router.get('/create', requireEditor, (req, res) => {
    res.render('pages/create-article', { title: 'Novo Artigo', currentPage: 'articles' });
});

router.post('/create', requireEditor, async (req, res) => {
    const { title, summary, content, image_url, category } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO articles (title, summary, content, image_url, category, author_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id",
            [title, summary, content, image_url, category, req.session.user.id]
        );
        
        // Disparar Notificação para todos
        await notificationService.notifyNewArticle(title, result.rows[0].id);

        res.redirect('/articles');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao criar artigo.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT a.*, u.name as author_name FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        res.render('pages/article-details', { title: result.rows[0].title, article: result.rows[0] });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar artigo.' });
    }
});

module.exports = router;
