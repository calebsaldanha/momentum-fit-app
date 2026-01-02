const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Middleware de autenticação
const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/auth/login');
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

// --- ROTAS ESPECÍFICAS (DEVEM VIR ANTES DE /:id) ---

// 1. Listar Artigos (Público/Logged)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/articles', { 
            title: 'Artigos', 
            articles: result.rows, 
            user: req.session.user,
            currentPage: 'articles'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar artigos.' });
    }
});

// 2. Gerenciar Artigos (Admin)
router.get('/manage', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/manage-articles', { 
            title: 'Gerenciar Artigos', 
            articles: result.rows, 
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'articles'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar gerenciamento.' });
    }
});

// 3. Criar Artigo (GET - Formulário)
router.get('/create', requireAdmin, (req, res) => {
    res.render('pages/create-article', { 
        title: 'Novo Artigo', 
        user: req.session.user,
        csrfToken: res.locals.csrfToken,
        currentPage: 'articles'
    });
});

// 4. Criar Artigo (POST - Salvar)
router.post('/create', requireAdmin, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    try {
        await pool.query(
            "INSERT INTO articles (title, content, image_url, category, author_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
            [title, content, image_url, category, req.session.user.id]
        );
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao criar artigo.' });
    }
});

// 5. Editar Artigo (GET)
router.get('/edit/:id', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        
        res.render('pages/create-article', { // Reutilizando a view de create
            title: 'Editar Artigo',
            article: result.rows[0], // Passa o objeto article para preencher o form
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'articles'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// 6. Editar Artigo (POST)
router.post('/edit/:id', requireAdmin, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    try {
        await pool.query(
            "UPDATE articles SET title = $1, content = $2, image_url = $3, category = $4 WHERE id = $5",
            [title, content, image_url, category, req.params.id]
        );
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao atualizar artigo.' });
    }
});

// 7. Excluir Artigo (POST)
router.post('/delete/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao excluir artigo.' });
    }
});

// --- ROTA GENÉRICA (DEVE SER A ÚLTIMA) ---

// 8. Ver Detalhes do Artigo
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT a.*, u.name as author_name FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        
        res.render('pages/article-details', { 
            title: result.rows[0].title, 
            article: result.rows[0], 
            user: req.session.user,
            currentPage: 'articles'
        });
    } catch (err) {
        console.error(err);
        // Se o ID não for numérico (UUID), pode cair aqui
        res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
    }
});

module.exports = router;
