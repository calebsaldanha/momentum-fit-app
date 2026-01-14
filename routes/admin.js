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

module.exports = router;
