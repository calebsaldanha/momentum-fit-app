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

// Usuários (Correção do erro de carregamento)
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC");
        res.render('pages/admin-clients', { users: result.rows });
    } catch (err) {
        console.error("Erro users:", err);
        res.render('pages/admin-clients', { users: [], messages: { error: 'Erro ao carregar usuários.' } });
    }
});

// Conteúdos
router.get('/content', async (req, res) => {
    try {
        // Tenta buscar, se falhar envia vazio
        const result = await db.query("SELECT * FROM articles ORDER BY created_at DESC");
        res.render('pages/admin-content', { articles: result.rows });
    } catch (err) {
        res.render('pages/admin-content', { articles: [] });
    }
});

// Auditoria IA
router.get('/ia-audit', async (req, res) => {
    // Mock data enquanto não temos tabela de logs de IA
    const logs = [
        { date: new Date(), user: 'Sistema', prompt: 'Teste inicial', tokens: 0, status: 'Simulado' }
    ];
    res.render('pages/admin-ia-audit', { logs });
});

// Configurações do Sistema
router.get('/settings', (req, res) => {
    res.render('pages/admin-settings');
});

// Aprovações
router.get('/approvals', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.id, u.name, u.email, t.specialties 
            FROM trainers t JOIN users u ON t.user_id = u.id 
            WHERE t.is_approved = false
        `);
        res.render('pages/admin-approvals', { pendingTrainers: result.rows });
    } catch (err) {
        res.render('pages/admin-approvals', { pendingTrainers: [] });
    }
});

// Financeiro
router.get('/finance', async (req, res) => {
    // Busca dados reais da nova tabela payments se existir
    try {
        const result = await db.query("SELECT SUM(amount) as total FROM payments WHERE status = 'paid'");
        const total = result.rows[0].total || 0;
        res.render('pages/admin-finance', { revenue: { total } });
    } catch (e) {
        res.render('pages/admin-finance', { revenue: { total: 0 } });
    }
});

module.exports = router;
