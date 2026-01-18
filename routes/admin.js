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
        res.render('pages/admin-dashboard', { stats: { totalUsers: 0, pendingApprovals: 0 } });
    }
});

// Lista de Usuários
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC");
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        console.error("Erro users:", err);
        res.render('pages/admin-clients', { users: [], messages: { error: 'Erro ao carregar lista.' } });
    }
});

// Detalhes do Usuário (CORREÇÃO CRÍTICA)
router.get('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 1. Busca dados básicos (Tabela users sempre tem dados)
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        
        if (userRes.rows.length === 0) {
            req.flash('error', 'Usuário não encontrado.');
            return res.redirect('/admin/users');
        }
        
        const user = userRes.rows[0];
        let details = {}; // Inicializa vazio para não quebrar o EJS

        // 2. Busca dados complementares (Pode não existir ainda)
        if (user.role === 'trainer') {
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [userId]);
            if (trainerRes.rows.length > 0) details = trainerRes.rows[0];
        } else if (user.role === 'client') {
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [userId]);
            if (clientRes.rows.length > 0) details = clientRes.rows[0];
        }

        res.render('pages/admin-user-details', { targetUser: user, details });
        
    } catch (err) {
        console.error("Erro Admin User Details:", err);
        req.flash('error', 'Erro ao carregar detalhes.');
        res.redirect('/admin/users');
    }
});

// Ação: Bloquear/Desbloquear
router.post('/users/:id/toggle-status', async (req, res) => {
    try {
        await db.query("UPDATE users SET active = NOT active WHERE id = $1", [req.params.id]);
        req.flash('success', 'Status atualizado.');
    } catch(e) { req.flash('error', 'Erro ao atualizar.'); }
    res.redirect(`/admin/users/${req.params.id}`);
});

// Outras rotas Admin
router.get('/approvals', async (req, res) => {
    try {
        const result = await db.query("SELECT t.id, u.name FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.is_approved = false");
        res.render('pages/admin-approvals', { pendingTrainers: result.rows });
    } catch (e) { res.render('pages/admin-approvals', { pendingTrainers: [] }); }
});

router.post('/approve/:id', async (req, res) => {
    await db.query('UPDATE trainers SET is_approved = true WHERE id = $1', [req.params.id]);
    res.redirect('/admin/approvals');
});

router.get('/finance', (req, res) => res.render('pages/admin-finance', { revenue: { total: 0 } }));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/plans', async (req, res) => {
    // Busca do banco mas a view tem fallback visual se quiser usar
    try {
        const plans = await db.query("SELECT * FROM plans");
        res.render('pages/admin-plans', { plans: plans.rows });
    } catch(e) { res.render('pages/admin-plans', { plans: [] }); }
});
router.get('/ia-audit', async (req, res) => {
    try {
        const logs = await db.query("SELECT * FROM ia_logs ORDER BY created_at DESC LIMIT 20");
        res.render('pages/admin-ia-audit', { logs: logs.rows });
    } catch(e) { res.render('pages/admin-ia-audit', { logs: [] }); }
});
router.get('/settings', (req, res) => res.render('pages/admin-settings'));

module.exports = router;
