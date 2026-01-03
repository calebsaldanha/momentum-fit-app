const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewArticlePendingEmail, sendArticlePublishedEmail } = require('../utils/emailService');

const requireStaff = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

router.get('/', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC");
        res.render('pages/articles', { title: 'Artigos', articles: result.rows, user: req.session.user, currentPage: 'articles' });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar artigos.' });
    }
});

router.get('/manage', requireStaff, async (req, res) => {
    try {
        let result;
        const user = req.session.user;
        if (user.role === 'superadmin') {
            result = await pool.query(`SELECT a.*, u.name as author_name FROM articles a LEFT JOIN users u ON a.author_id = u.id ORDER BY CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END, a.created_at DESC`);
        } else {
            result = await pool.query(`SELECT * FROM articles WHERE author_id = $1 ORDER BY created_at DESC`, [user.id]);
        }
        res.render('pages/manage-articles', { title: 'Gerenciar Artigos', articles: result.rows, user: user, csrfToken: res.locals.csrfToken, currentPage: 'articles-manage' });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar gerenciamento.' });
    }
});

router.get('/create', requireStaff, (req, res) => {
    res.render('pages/create-article', { title: 'Novo Artigo', user: req.session.user, csrfToken: res.locals.csrfToken, currentPage: 'articles-manage' });
});

router.post('/create', requireStaff, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    const user = req.session.user;
    const status = user.role === 'superadmin' ? 'published' : 'pending';

    try {
        const newArt = await pool.query(
            "INSERT INTO articles (title, content, image_url, category, author_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id",
            [title, content, image_url, category, user.id, status]
        );

        // NOTIFICAÇÃO
        if (status === 'pending') {
            // Envia para Admin
            const adminRes = await pool.query("SELECT email FROM users WHERE role = 'superadmin' LIMIT 1");
            if (adminRes.rows.length > 0) {
                sendNewArticlePendingEmail(adminRes.rows[0].email, title, user.name, req.headers.host).catch(console.error);
            }
        } else {
            // Se Admin criou e já publicou -> Broadcast para todos (cuidado com volume)
            // Vou limitar a pegar emails de users ativos
            const usersRes = await pool.query("SELECT email FROM users WHERE status = 'active'");
            const emails = usersRes.rows.map(u => u.email);
            if (emails.length > 0) {
                 sendArticlePublishedEmail(emails, title, user.name, req.headers.host).catch(console.error);
            }
        }

        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao criar artigo.' });
    }
});

router.get('/edit/:id', requireStaff, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        const article = result.rows[0];
        if (req.session.user.role !== 'superadmin' && article.author_id !== req.session.user.id) {
             return res.status(403).render('pages/error', { message: 'Sem permissão.' });
        }
        res.render('pages/create-article', { title: 'Editar Artigo', article: article, user: req.session.user, csrfToken: res.locals.csrfToken, currentPage: 'articles-manage' });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

router.post('/edit/:id', requireStaff, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    try {
        await pool.query("UPDATE articles SET title = $1, content = $2, image_url = $3, category = $4 WHERE id = $5", [title, content, image_url, category, req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao atualizar.' });
    }
});

router.post('/delete/:id', requireStaff, async (req, res) => {
    try {
        await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao excluir.' });
    }
});

// APROVAÇÃO (ADMIN)
router.post('/approve/:id', requireSuperAdmin, async (req, res) => {
    try {
        const artRes = await pool.query("UPDATE articles SET status = 'published' WHERE id = $1 RETURNING title, author_id", [req.params.id]);
        const article = artRes.rows[0];
        
        if (article) {
            // Busca nome do autor
            const authorRes = await pool.query("SELECT name FROM users WHERE id = $1", [article.author_id]);
            const authorName = authorRes.rows[0]?.name || 'Momentum Fit';

            // NOTIFICAÇÃO: Broadcast de Publicação
            const usersRes = await pool.query("SELECT email FROM users WHERE status = 'active'");
            const emails = usersRes.rows.map(u => u.email);
            if (emails.length > 0) {
                 sendArticlePublishedEmail(emails, article.title, authorName, req.headers.host).catch(console.error);
            }
        }
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao aprovar");
    }
});

router.post('/reject/:id', requireSuperAdmin, async (req, res) => {
    try {
        await pool.query("UPDATE articles SET status = 'rejected' WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        res.status(500).send("Erro ao rejeitar");
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT a.*, u.name as author_name FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        const article = result.rows[0];
        if (article.status !== 'published' && (!req.session.user || (req.session.user.role !== 'superadmin' && req.session.user.id !== article.author_id))) {
            return res.status(404).render('pages/error', { message: 'Artigo indisponível.' });
        }
        res.render('pages/article-details', { title: article.title, article: article, user: req.session.user, currentPage: 'articles' });
    } catch (err) {
        res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
    }
});

module.exports = router;
