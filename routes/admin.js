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
        const pending = await db.query('SELECT COUNT(*) FROM trainers WHERE is_approved = false');
        res.render('pages/admin-dashboard', { 
            stats: { totalUsers: totalUsers.rows[0].count, pendingApprovals: pending.rows[0].count } 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/admin-dashboard', { stats: { totalUsers: 0, pendingApprovals: 0 } });
    }
});

// Usuários (Correção Robusta)
router.get('/users', async (req, res) => {
    try {
        // Left Join para garantir que traga dados mesmo se o join falhar (embora users sempre exista)
        const result = await db.query(`
            SELECT id, name, email, role, active, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        console.error("Erro ao carregar usuários:", err);
        // Renderiza a página vazia em vez de crashar
        res.render('pages/admin-clients', { users: [], messages: { error: 'Erro técnico ao carregar lista.' } });
    }
});

// Auditoria IA (Dados Reais)
router.get('/ia-audit', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT l.*, u.name as user_name 
            FROM ia_logs l
            JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC LIMIT 50
        `);
        res.render('pages/admin-ia-audit', { logs: result.rows });
    } catch (err) {
        console.error(err);
        res.render('pages/admin-ia-audit', { logs: [] });
    }
});

// Outras rotas Admin essenciais
router.get('/finance', (req, res) => res.render('pages/admin-finance', { revenue: { total: 0 } }));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));
router.get('/approvals', async (req, res) => {
    try {
        const result = await db.query("SELECT t.id, u.name FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.is_approved = false");
        res.render('pages/admin-approvals', { pendingTrainers: result.rows });
    } catch (e) { res.render('pages/admin-approvals', { pendingTrainers: [] }); }
});

module.exports = router;
