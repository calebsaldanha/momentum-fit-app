const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('admin'));

router.get('/dashboard', async (req, res) => {
    try {
        // Dados Reais
        const usersCount = await db.query("SELECT COUNT(*) FROM users");
        const trainersCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'");
        // Simulando aprovações se não houver tabela
        const approvalsCount = 0; 

        const stats = {
            total_users: usersCount.rows[0].count,
            total_trainers: trainersCount.rows[0].count,
            pending_approvals: approvalsCount
        };

        res.render('pages/admin-dashboard', {
            user: req.user,
            stats,
            pendingTrainers: [],
            path: '/admin/dashboard'
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro Admin DB', user: req.user, path: '' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC LIMIT 50");
        res.render('pages/admin-users', {
            user: req.user,
            users: result.rows,
            path: '/admin/users'
        });
    } catch (err) {
        res.render('pages/admin-users', { user: req.user, users: [], path: '/admin/users' });
    }
});

router.get('/approvals', (req, res) => {
    res.render('pages/admin-approvals', { user: req.user, pending: [], path: '/admin/approvals' });
});

router.get('/finance', (req, res) => {
    res.render('pages/admin-finance', { user: req.user, stats: { revenue: 0 }, path: '/admin/finance' });
});

router.get('/settings', (req, res) => {
    res.render('pages/admin-settings', { user: req.user, settings: { ai_model: 'GPT-4' }, path: '/admin/settings' });
});

module.exports = router;
