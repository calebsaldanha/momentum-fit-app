const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Listar (Público)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/articles', { 
            title: 'Blog', 
            articles: result.rows,
            user: req.session.user || null
        });
    } catch (err) { res.render('pages/error', { message: 'Erro artigos.' }); }
});

// Detalhes (Público)
router.get('/:id', async (req, res) => {
    // Verifica se é 'create' (que pode ser confundido com ID se não tratado antes, mas a ordem das rotas importa)
    if (req.params.id === 'create') return res.redirect('/articles/create'); // Fallback

    try {
        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        res.render('pages/article-details', { title: result.rows[0].title, article: result.rows[0], user: req.session.user || null });
    } catch (err) { res.render('pages/error', { message: 'Erro artigo.' }); }
});

// Criar (Auth) - Colocar ANTES da rota /:id no index principal ou garantir ordem
// Como este arquivo é um router, a ordem aqui é: /, /create, /:id.
// Se /create for definido abaixo de /:id, o express achará que "create" é um ID.
// Vamos reordenar.

// -- REORDENANDO --

// Criar (GET)
router.get('/new/create', async (req, res) => { // Mudando para /new/create para evitar conflito ou garantir que o router principal monte corretamente
    if (!req.session.user || (req.session.user.role !== 'superadmin' && req.session.user.role !== 'trainer')) {
        return res.redirect('/articles');
    }
    
    // Sidebar Context: Superadmin -> Manage, Trainer -> Admin
    const contextPage = req.session.user.role === 'superadmin' ? 'superadmin-manage' : 'admin-dashboard';
    
    res.render('pages/create-article', { 
        title: 'Novo Artigo', 
        csrfToken: res.locals.csrfToken,
        user: req.session.user,
        currentPage: contextPage
    });
});

// Criar (POST)
router.post('/new/create', upload.single('image'), async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
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
        await notificationService.notifyNewArticle(title, newArticle.rows[0].id);
        res.redirect('/articles');
    } catch (err) { res.render('pages/error', { message: 'Erro ao criar.' }); }
});

module.exports = router;
