const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');
const multer = require('multer');
const { put } = require('@vercel/blob');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Rota Pública: Listar Artigos (Blog)
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

// Rota Restrita: Gerenciar Artigos (Super Admin)
router.get('/manage', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'superadmin') {
        return res.redirect('/articles');
    }
    
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/manage-articles', { 
            title: 'Gerenciar Blog',
            articles: result.rows,
            user: req.session.user,
            currentPage: 'articles-manage', // Identificador para o Sidebar ficar verde
            csrfToken: res.locals.csrfToken
        });
    } catch (err) { res.render('pages/error', { message: 'Erro ao carregar gestão.' }); }
});

// Criar (GET)
router.get('/create', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'superadmin') {
        return res.redirect('/articles'); // Apenas Super Admin cria agora
    }
    
    res.render('pages/create-article', { 
        title: 'Novo Artigo', 
        csrfToken: res.locals.csrfToken,
        user: req.session.user,
        currentPage: 'articles-manage' // Mantém o menu "Gerenciar Blog" ativo
    });
});

// Criar (POST)
router.post('/create', upload.single('image'), async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'superadmin') return res.redirect('/auth/login');
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
        res.redirect('/articles/manage'); // Volta para a gestão
    } catch (err) { res.render('pages/error', { message: 'Erro ao criar.' }); }
});

// Detalhes (Público) - Deve vir por último para não conflitar com /manage
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        res.render('pages/article-details', { title: result.rows[0].title, article: result.rows[0], user: req.session.user || null });
    } catch (err) { res.render('pages/error', { message: 'Erro artigo.' }); }
});

// Excluir
router.post('/:id/delete', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'superadmin') return res.status(403).send('Negado');
    try {
        await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) { res.render('pages/error', { message: 'Erro ao excluir.' }); }
});

module.exports = router;
