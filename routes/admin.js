const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware Admin
function requireAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login?error=Acesso restrito');
}
router.use(requireAdmin);

// 1. DASHBOARD
router.get('/dashboard', async (req, res) => {
    try {
        const users = await db.query("SELECT COUNT(*) FROM users");
        const trainers = await db.query("SELECT COUNT(*) FROM trainers");
        const articles = await db.query("SELECT COUNT(*) FROM articles");
        const pending = await db.query("SELECT COUNT(*) FROM trainers WHERE approval_status = 'pending'");

        res.render('pages/admin-dashboard', { 
            title: 'Admin Dashboard', 
            currentPage: '/admin/dashboard',
            active: 'dashboard',
            stats: { 
                users: users.rows[0].count, 
                trainers: trainers.rows[0].count,
                articles: articles.rows[0].count,
                pending: pending.rows[0].count 
            }
        });
    } catch (e) { res.render('pages/error', { message: 'Erro no dashboard' }); }
});

// 2. CLIENTES / USUÁRIOS
router.get('/clients', async (req, res) => {
    try {
        const users = await db.query("SELECT id, name, email, role, created_at, is_active FROM users ORDER BY created_at DESC LIMIT 50");
        res.render('pages/admin-clients', { 
            title: 'Gestão de Usuários', 
            users: users.rows, 
            active: 'clients', 
            currentPage: '/admin/clients' 
        });
    } catch(e) { res.render('pages/error'); }
});

// 3. APROVAÇÕES
router.get('/approvals', async (req, res) => {
    try {
        const pending = await db.query(`
            SELECT t.id as trainer_id, u.name, u.email, t.specialties, t.certifications, t.created_at
            FROM trainers t JOIN users u ON t.user_id = u.id 
            WHERE t.approval_status = 'pending'
        `);
        res.render('pages/admin-approvals', { 
            title: 'Aprovações', 
            pendingTrainers: pending.rows, 
            active: 'approvals',
            currentPage: '/admin/approvals'
        });
    } catch(e) { res.render('pages/error'); }
});

// ACTIONS APROVAÇÃO
router.post('/approve-trainer/:id', async (req, res) => {
    await db.query("UPDATE trainers SET approval_status = 'approved' WHERE id = $1", [req.params.id]);
    res.redirect('/admin/approvals?success=1');
});
router.post('/reject-trainer/:id', async (req, res) => {
    await db.query("UPDATE trainers SET approval_status = 'rejected' WHERE id = $1", [req.params.id]);
    res.redirect('/admin/approvals?success=0');
});

// 4. CONTEÚDO (BLOG)
router.get('/content', async (req, res) => {
    try {
        const articles = await db.query("SELECT id, title, category, status, views, created_at FROM articles ORDER BY created_at DESC");
        res.render('pages/admin-content', { 
            title: 'Gestão de Conteúdo', 
            articles: articles.rows, 
            active: 'content',
            currentPage: '/admin/content'
        });
    } catch(e) { res.render('pages/error'); }
});

// 5. FINANCEIRO (MOCK)
router.get('/finance', (req, res) => {
    const transactions = [
        { id: 1, user: 'João Silva', plan: 'Pro Evolution', amount: 59.90, date: new Date(), status: 'paid' },
        { id: 2, user: 'Maria Souza', plan: 'Fit Start', amount: 29.90, date: new Date(), status: 'paid' },
        { id: 3, user: 'Carlos Pedro', plan: 'Elite', amount: 99.90, date: new Date(), status: 'pending' }
    ];
    res.render('pages/admin-finance', { 
        title: 'Financeiro', 
        transactions, 
        revenue: 12500.00,
        active: 'finance',
        currentPage: '/admin/finance'
    });
});

// 6. PLANOS (MOCK)
router.get('/plans', (req, res) => {
    const plans = [
        { id: 1, name: 'Fit Start', price: 29.90, users: 120, active: true },
        { id: 2, name: 'Pro Evolution', price: 59.90, users: 85, active: true },
        { id: 3, name: 'Elite Personal', price: 99.90, users: 15, active: false }
    ];
    res.render('pages/admin-plans', { 
        title: 'Planos de Assinatura', 
        plans, 
        active: 'plans',
        currentPage: '/admin/plans'
    });
});

// 7. IA AUDIT (MOCK)
router.get('/ia-audit', (req, res) => {
    const logs = [
        { id: 101, action: 'Generate Workout', user: 'Trainer X', tokens: 150, cost: 0.002, time: '2025-01-17 14:30' },
        { id: 102, action: 'Chat Reply', user: 'Client Y', tokens: 45, cost: 0.0005, time: '2025-01-17 14:32' }
    ];
    res.render('pages/admin-ia-audit', { 
        title: 'Auditoria de IA', 
        logs, 
        active: 'ia-audit',
        currentPage: '/admin/ia-audit'
    });
});

// 8. CONFIGURAÇÕES
router.get('/settings', (req, res) => {
    res.render('pages/admin-settings', { 
        title: 'Configurações Globais', 
        config: { maintenance: false, allow_registrations: true },
        active: 'settings',
        currentPage: '/admin/settings'
    });
});

module.exports = router;
