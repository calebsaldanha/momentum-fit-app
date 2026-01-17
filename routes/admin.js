const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) return next();
    res.status(403).render('pages/error', { message: 'Acesso Negado' });
}
router.use(requireAdmin);

router.get('/dashboard', async (req, res) => {
    const counts = await db.query("SELECT (SELECT COUNT(*) FROM users) as users, (SELECT COUNT(*) FROM trainers WHERE approval_status = 'pending') as pending");
    res.render('pages/admin-dashboard', { title: 'Admin Dashboard', stats: counts.rows[0] });
});

// Rotas Faltantes
router.get('/clients', async (req, res) => {
    const users = await db.query("SELECT * FROM users WHERE role = 'client' ORDER BY created_at DESC");
    res.render('pages/admin-clients', { title: 'Gestão de Clientes', users: users.rows });
});

router.get('/approvals', async (req, res) => {
    const pending = await db.query("SELECT t.*, u.name, u.email FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.approval_status = 'pending'");
    res.render('pages/admin-approvals', { title: 'Aprovações Pendentes', pendingTrainers: pending.rows });
});

router.get('/content', (req, res) => res.render('pages/admin-content', { title: 'Moderação de Conteúdo' }));
router.get('/finance', (req, res) => res.render('pages/admin-finance', { title: 'Financeiro' }));
router.get('/plans', (req, res) => res.render('pages/admin-plans', { title: 'Gestão de Planos' }));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit', { title: 'Auditoria de IA' }));
router.get('/settings', (req, res) => res.render('pages/admin-settings', { title: 'Configurações Globais' }));

module.exports = router;
