const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const { body, validationResult } = require('express-validator');
const notificationService = require('../utils/notificationService');

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

const requireSuperAdminAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado. Você não tem permissão para acessar esta página.' });
};

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT a.id, a.title, a.content, a.category, a.created_at, u.name as author_name
            FROM articles a
            JOIN users u ON a.author_id = u.id
            ORDER BY a.created_at DESC;
        `;
        const result = await pool.query(query);
        res.render('pages/articles', {
            title: 'Artigos - Momentum Fit',
            articles: result.rows,
            currentCategory: null
        });
    } catch (err) {
        console.error("Erro ao buscar artigos:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar os artigos.' });
    }
});

router.get('/create', requireSuperAdminAuth, (req, res) => {
    res.render('pages/create-article', { currentPage: 'create-article', title: 'Criar Novo Artigo - Momentum Fit' });
});

router.post('/create', requireSuperAdminAuth, [
    body('title').notEmpty().withMessage('Título é obrigatório.').trim(),
    body('content').notEmpty().withMessage('Conteúdo é obrigatório.').trim(),
    body('category').notEmpty().withMessage('Categoria é obrigatória.').trim()
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { title, content, category } = req.body;
    const author_id = req.session.user.id;
    
    try {
        const sanitizedContent = DOMPurify.sanitize(content);
        const query = 'INSERT INTO articles (title, content, author_id, category) VALUES ($1, $2, $3, $4) RETURNING id';
        const result = await pool.query(query, [title, sanitizedContent, author_id, category]);
        const newArticleId = result.rows[0].id;

        await notificationService.notifyNewArticle(title, newArticleId);

        res.json({ success: true, articleId: newArticleId });
    } catch (err) {
        console.error("Erro ao criar artigo:", err);
        res.status(500).json({ success: false, message: 'Erro ao salvar o artigo no banco de dados.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const articleId = req.params.id;
        const query = `
            SELECT a.id, a.title, a.content, a.category, a.created_at, u.name as author_name
            FROM articles a
            JOIN users u ON a.author_id = u.id
            WHERE a.id = $1;
        `;
        const result = await pool.query(query, [articleId]);
        if (result.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        }
        const article = result.rows[0];
        res.render('pages/article-details', {
            title: article.title,
            article: article
        });
    } catch (err) {
        console.error("Erro ao buscar detalhe do artigo:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar o artigo.' });
    }
});

router.post('/delete/:id', requireSuperAdminAuth, async (req, res) => {
    try {
        await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
        res.redirect('/articles');
    } catch (err) {
        console.error("Erro ao excluir artigo:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível excluir o artigo.' });
    }
});

module.exports = router;
