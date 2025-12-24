const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob');

// Configuração do Multer para upload em memória
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// Middleware para verificar se é Admin (Superadmin)
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.redirect('/articles'); // Se não for admin, volta pra lista
};

// Listar Artigos (Público/Logado)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/articles', { 
            title: 'Blog & Artigos', 
            articles: result.rows,
            user: req.session.user || null,
            currentPage: 'articles'
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar artigos.' });
    }
});

// Criar Artigo (GET)
router.get('/create', requireAdmin, (req, res) => {
    res.render('pages/create-article', { title: 'Novo Artigo', csrfToken: res.locals.csrfToken });
});

// Criar Artigo (POST)
router.post('/create', requireAdmin, upload.single('image'), async (req, res) => {
    const { title, summary, content, videoUrl } = req.body;
    let imageUrl = null;

    try {
        if (req.file) {
            const filename = `articles/${Date.now()}-${req.file.originalname}`;
            const blob = await put(filename, req.file.buffer, { access: 'public', contentType: req.file.mimetype });
            imageUrl = blob.url;
        }

        const newArticle = await pool.query(
            "INSERT INTO articles (title, summary, content, image_url, video_url, author_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [title, summary, content, imageUrl, videoUrl, req.session.user.id]
        );

        // NOTIFICAÇÃO: Avise clientes e personais
        await notificationService.notifyNewArticle(title, newArticle.rows[0].id);

        res.redirect('/articles');
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao criar artigo.' });
    }
});

// Ver Artigo
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        
        res.render('pages/article-details', { 
            title: result.rows[0].title, 
            article: result.rows[0],
            user: req.session.user || null,
            currentPage: 'articles'
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar artigo.' });
    }
});

// Excluir Artigo
router.post('/:id/delete', requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
        res.redirect('/articles');
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao excluir artigo.' });
    }
});

module.exports = router;
