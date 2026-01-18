const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isAdmin);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await db.query('SELECT COUNT(*) FROM users');
        res.render('pages/admin-dashboard', { 
            stats: { totalUsers: totalUsers.rows[0].count, pendingApprovals: 0 } 
        });
    } catch (err) {
        res.render('pages/admin-dashboard', { stats: { totalUsers: 0, pendingApprovals: 0 } });
    }
});

// Usuários (Query Corrigida e Segura)
router.get('/users', async (req, res) => {
    try {
        // Agora a coluna 'active' foi criada pelo script de reparo
        const result = await db.query(`
            SELECT id, name, email, role, active, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        console.error("Erro Admin Users:", err);
        res.render('pages/admin-clients', { users: [], messages: { error: 'Erro ao carregar lista.' } });
    }
});

// Auditoria IA (Removido dados falsos, busca do banco ou vazio)
router.get('/ia-audit', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM ia_logs ORDER BY created_at DESC LIMIT 20");
        res.render('pages/admin-ia-audit', { logs: result.rows });
    } catch (err) {
        res.render('pages/admin-ia-audit', { logs: [] });
    }
});

// Outras rotas
router.get('/finance', (req, res) => res.render('pages/admin-finance', { revenue: { total: 0 } }));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/plans', async (req, res) => {
    const plans = await db.query("SELECT * FROM plans");
    res.render('pages/admin-plans', { plans: plans.rows });
});
router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { pendingTrainers: [] }));

module.exports = router;
