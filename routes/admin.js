const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) return next();
    res.redirect('/auth/login');
}

router.use(isAdmin);

router.get('/dashboard', async (req, res) => {
    res.render('pages/admin-dashboard', { stats: { totalUsers: 0, pendingApprovals: 0 } });
});

router.get('/users', async (req, res) => {
    const result = await db.query("SELECT * FROM users");
    res.render('pages/admin-clients', { users: result.rows });
});

router.get('/approvals', async (req, res) => {
    const result = await db.query("SELECT t.id, u.name FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.is_approved = false");
    res.render('pages/admin-approvals', { pendingTrainers: result.rows });
});

router.get('/finance', (req, res) => {
    res.render('pages/admin-finance', { revenue: { total: 0 } });
});

router.get('/plans', async (req, res) => {
    const result = await db.query("SELECT * FROM plans");
    res.render('pages/admin-plans', { plans: result.rows });
});

router.get('/content', (req, res) => {
    res.render('pages/admin-content');
});

// Auditoria de IA
router.get('/ia-audit', (req, res) => {
    res.render('pages/admin-ia-audit');
});

// Configurações Globais
router.get('/settings', (req, res) => {
    res.render('pages/admin-settings');
});

module.exports = router;
