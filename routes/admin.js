const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware Admin
function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        // Estatísticas gerais do sistema
        const usersCount = await db.query("SELECT COUNT(*) FROM users");
        const trainersCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'");
        
        res.render('pages/admin-dashboard', { 
            title: 'Admin Dashboard', 
            user: req.session.user, 
            stats: { 
                users: usersCount.rows[0].count,
                trainers: trainersCount.rows[0].count 
            },
            currentPage: '/admin/dashboard',
            csrfToken: req.csrfToken()
        });
    } catch (e) { console.error(e); res.render('pages/error'); }
});

router.get('/clients', async (req, res) => {
    try {
        const users = await db.query("SELECT * FROM users ORDER BY id DESC");
        res.render('pages/admin-clients', { 
            title: 'Gerenciar Usuários', 
            user: req.session.user, 
            users: users.rows,
            currentPage: '/admin/clients',
            csrfToken: req.csrfToken()
        });
    } catch (e) { console.error(e); res.redirect('/admin/dashboard'); }
});


// Páginas adicionais solicitadas
router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { title: 'Aprovações', user: req.session.user, currentPage: '/admin/approvals', csrfToken: req.csrfToken() }));
router.get('/content', (req, res) => res.render('pages/admin-content', { title: 'Gestão de Conteúdo', user: req.session.user, currentPage: '/admin/content', csrfToken: req.csrfToken() }));
router.get('/plans', (req, res) => res.render('pages/admin-plans', { title: 'Gestão de Planos', user: req.session.user, currentPage: '/admin/plans', csrfToken: req.csrfToken() }));
router.get('/finance', (req, res) => res.render('pages/admin-finance', { title: 'Financeiro Geral', user: req.session.user, currentPage: '/admin/finance', csrfToken: req.csrfToken() }));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit', { title: 'Auditoria IA', user: req.session.user, currentPage: '/admin/ia-audit', csrfToken: req.csrfToken() }));
router.get('/settings', (req, res) => res.render('pages/admin-settings', { title: 'Configurações Globais', user: req.session.user, currentPage: '/admin/settings', csrfToken: req.csrfToken() }));

module.exports = router;
