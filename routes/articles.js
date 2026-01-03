const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Middleware: Permite Treinador e Superadmin (Staff)
const requireStaff = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado. Apenas para a equipe.' });
};

// Middleware: Apenas Superadmin (para aprovar/reprovar)
const requireSuperAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'superadmin') {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado. Requer permissão de Superadmin.' });
};

// 1. Listar Artigos (Público) - APENAS PUBLICADOS
router.get('/', async (req, res) => {
    try {
        // Filtra apenas status 'published'
        const result = await pool.query("SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC");
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

// 2. Gerenciar Artigos (Dashboard)
router.get('/manage', requireStaff, async (req, res) => {
    try {
        let result;
        const user = req.session.user;

        if (user.role === 'superadmin') {
            // Superadmin vê TUDO, ordenado por status (pendentes primeiro)
            result = await pool.query(`
                SELECT a.*, u.name as author_name 
                FROM articles a 
                LEFT JOIN users u ON a.author_id = u.id 
                ORDER BY 
                    CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END,
                    a.created_at DESC
            `);
        } else {
            // Treinador vê apenas os SEUS artigos
            result = await pool.query(`
                SELECT * FROM articles 
                WHERE author_id = $1 
                ORDER BY created_at DESC
            `, [user.id]);
        }

        res.render('pages/manage-articles', { 
            title: 'Gerenciar Artigos', 
            articles: result.rows, 
            user: user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'articles-manage' // Mantém o menu ativo corretamente
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar gerenciamento.' });
    }
});

// 3. Criar Artigo (GET - Formulário)
router.get('/create', requireStaff, (req, res) => {
    res.render('pages/create-article', { 
        title: 'Novo Artigo', 
        user: req.session.user,
        csrfToken: res.locals.csrfToken,
        currentPage: 'articles-manage'
    });
});

// 4. Criar Artigo (POST - Salvar)
router.post('/create', requireStaff, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    const user = req.session.user;
    
    // Lógica de Status: Superadmin publica direto, Treinador fica pendente
    const status = user.role === 'superadmin' ? 'published' : 'pending';

    try {
        await pool.query(
            "INSERT INTO articles (title, content, image_url, category, author_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
            [title, content, image_url, category, user.id, status]
        );
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao criar artigo.' });
    }
});

// 5. Editar Artigo (GET)
router.get('/edit/:id', requireStaff, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        
        const article = result.rows[0];

        // Proteção: Treinador só edita o próprio artigo
        if (req.session.user.role !== 'superadmin' && article.author_id !== req.session.user.id) {
             return res.status(403).render('pages/error', { message: 'Você não tem permissão para editar este artigo.' });
        }

        res.render('pages/create-article', { 
            title: 'Editar Artigo',
            article: article, 
            user: req.session.user,
            csrfToken: res.locals.csrfToken,
            currentPage: 'articles-manage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// 6. Editar Artigo (POST)
router.post('/edit/:id', requireStaff, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    const user = req.session.user;

    try {
        // Verifica permissão antes de atualizar
        const check = await pool.query("SELECT author_id FROM articles WHERE id = $1", [req.params.id]);
        if (check.rows.length > 0) {
            if (user.role !== 'superadmin' && check.rows[0].author_id !== user.id) {
                return res.status(403).send("Acesso negado");
            }
        }

        // Se o treinador editar, volta para pendente? 
        // Por enquanto mantemos o status atual ou resetamos para pending se quiser rigor.
        // Vamos manter o status atual para simplificar, a menos que seja um novo submit.
        
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
router.post('/delete/:id', requireStaff, async (req, res) => {
    const user = req.session.user;
    try {
        // Verifica permissão
        const check = await pool.query("SELECT author_id FROM articles WHERE id = $1", [req.params.id]);
        if (check.rows.length > 0) {
             if (user.role !== 'superadmin' && check.rows[0].author_id !== user.id) {
                return res.status(403).send("Acesso negado");
            }
        }

        await pool.query("DELETE FROM articles WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao excluir artigo.' });
    }
});

// --- ROTAS DE MODERAÇÃO (APENAS SUPERADMIN) ---

// 8. Aprovar Artigo
router.post('/approve/:id', requireSuperAdmin, async (req, res) => {
    try {
        await pool.query("UPDATE articles SET status = 'published' WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao aprovar");
    }
});

// 9. Rejeitar Artigo
router.post('/reject/:id', requireSuperAdmin, async (req, res) => {
    try {
        await pool.query("UPDATE articles SET status = 'rejected' WHERE id = $1", [req.params.id]);
        res.redirect('/articles/manage');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao rejeitar");
    }
});

// --- ROTA GENÉRICA DE DETALHES ---
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT a.*, u.name as author_name FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
        
        // Se não for publicado, só o autor ou admin podem ver
        const article = result.rows[0];
        if (article.status !== 'published') {
            if (!req.session.user || (req.session.user.role !== 'superadmin' && req.session.user.id !== article.author_id)) {
                return res.status(404).render('pages/error', { message: 'Artigo indisponível.' });
            }
        }
        
        res.render('pages/article-details', { 
            title: article.title, 
            article: article, 
            user: req.session.user,
            currentPage: 'articles'
        });
    } catch (err) {
        console.error(err);
        res.status(404).render('pages/error', { message: 'Artigo não encontrado.' });
    }
});

module.exports = router;
