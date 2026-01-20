const express = require('express');
const router = express.Router();
const db = require('../database/db');
const notificationService = require('../utils/notificationService');

// Rota para Trainer Criar
router.post('/create', async (req, res) => {
    // Middleware de auth deve vir antes
    if(!req.session.user) return res.redirect('/auth/login');

    const { title, content, category } = req.body;
    try {
        await db.query(
            "INSERT INTO articles (title, content, category, author_id, status) VALUES ($1, $2, $3, $4, 'pending')",
            [title, content, category, req.session.user.id]
        );

        // Notificar Admin (Novo Artigo Pendente)
        await notificationService.notify({
            userId: 'ADMIN_GROUP',
            type: 'new_article_admin', // Template genérico
            title: 'Novo Artigo para Revisão',
            message: `O treinador ${req.session.user.name} submeteu "${title}".`,
            link: '/admin/content',
            data: { name: req.session.user.name, role: 'Trainer' }
        });

        req.flash('success', 'Artigo enviado para aprovação.');
        res.redirect('/trainer/content');
    } catch(e) { res.redirect('/trainer/content'); }
});

// Rota para Admin Aprovar (no Admin.js ou aqui se for modular, vamos por aqui para exemplo)
router.post('/approve/:id', async (req, res) => {
    if(req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') return res.redirect('/');
    
    try {
        const articleRes = await db.query("UPDATE articles SET status='published' WHERE id=$1 RETURNING title, author_id", [req.params.id]);
        const article = articleRes.rows[0];

        // 1. Notificar Trainer (Aprovado)
        await notificationService.notify({
            userId: article.author_id,
            type: 'article_approved',
            title: 'Artigo Publicado',
            message: `Seu artigo "${article.title}" está no ar!`,
            link: `/articles/${req.params.id}`,
            data: { articleTitle: article.title }
        });

        // 2. Broadcast para CLIENTES (Artigo Novo)
        await notificationService.notify({
            userId: 'ALL_CLIENTS',
            type: 'new_article_broadcast',
            title: 'Novo Conteúdo no Blog',
            message: `Leia agora: "${article.title}"`,
            link: `/articles/${req.params.id}`,
            data: { articleTitle: article.title }
        });

        res.redirect('/admin/content');
    } catch(e){ res.redirect('/admin/content'); }
});

router.get('/', (req, res) => res.render('pages/articles', { articles: [] }));
router.get('/:id', (req, res) => res.render('pages/article-details', { article: {} }));

module.exports = router;
