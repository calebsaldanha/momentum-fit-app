const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware para passar dados de sessão
router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    next();
});

// GET /articles - Listagem com Busca e Filtros
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let queryText = `
            SELECT a.*, u.name as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE a.status = 'published'
        `;
        const params = [];
        let paramIndex = 1;

        if (category) {
            queryText += ` AND a.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (search) {
            queryText += ` AND (a.title ILIKE $${paramIndex} OR a.content ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        queryText += ` ORDER BY a.created_at DESC`;

        const articles = await db.query(queryText, params);
        
        // Busca categorias distintas para o filtro
        const categoriesRes = await db.query("SELECT DISTINCT category FROM articles WHERE status = 'published'");

        res.render('pages/articles', { 
            title: 'Artigos', 
            articles: articles.rows, 
            categories: categoriesRes.rows,
            searchTerm: search || '',
            selectedCategory: category || '',
            currentPage: 'articles' 
        });
    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro ao carregar artigos.', error: { status: 500 } });
    }
});

// GET /articles/:id - Detalhes (Slug ou ID)
router.get('/:id', async (req, res) => {
    try {
        // Tenta buscar por ID (se for numérico) ou Slug
        const identifier = req.params.id;
        let query;
        let params;

        if (/^\d+$/.test(identifier)) {
            query = `SELECT a.*, u.name as author_name, u.profile_image as author_img FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = $1`;
            params = [identifier];
        } else {
            query = `SELECT a.*, u.name as author_name, u.profile_image as author_img FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.slug = $1`;
            params = [identifier];
        }

        const article = await db.query(query, params);

        if (article.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Artigo não encontrado.', error: { status: 404 } });
        }

        // Incrementa visualizações
        await db.query('UPDATE articles SET views = views + 1 WHERE id = $1', [article.rows[0].id]);

        res.render('pages/article-details', { 
            title: article.rows[0].title, 
            article: article.rows[0],
            currentPage: 'articles'
        });
    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro interno.' });
    }
});

module.exports = router;
