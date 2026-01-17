const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware Admin Seguro
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
        // Consultas seguras com fallback
        const counts = { users: 0, trainers: 0, articles: 0, pending: 0 };
        
        try { counts.users = (await db.query("SELECT COUNT(*) FROM users")).rows[0].count; } catch(e){}
        try { counts.trainers = (await db.query("SELECT COUNT(*) FROM trainers")).rows[0].count; } catch(e){}
        try { counts.articles = (await db.query("SELECT COUNT(*) FROM articles")).rows[0].count; } catch(e){}
        try { counts.pending = (await db.query("SELECT COUNT(*) FROM trainers WHERE approval_status = 'pending'")).rows[0].count; } catch(e){}

        res.render('pages/admin-dashboard', { 
            title: 'Visão Geral', active: 'dashboard', stats: counts 
        });
    } catch (e) { res.render('pages/error', { message: 'Erro no Dashboard' }); }
});

// 2. CLIENTES
router.get('/clients', async (req, res) => {
    try {
        const users = await db.query("SELECT id, name, email, role, created_at, is_active FROM users ORDER BY created_at DESC LIMIT 50");
        res.render('pages/admin-clients', { title: 'Usuários', active: 'clients', users: users.rows });
    } catch(e) { res.render('pages/error'); }
});

// 3. APROVAÇÕES
router.get('/approvals', async (req, res) => {
    try {
        const pending = await db.query(`
            SELECT t.id as trainer_id, u.name, u.email, t.specialties, t.certifications, t.created_at
            FROM trainers t JOIN users u ON t.user_id = u.id WHERE t.approval_status = 'pending'
        `);
        res.render('pages/admin-approvals', { title: 'Aprovações', active: 'approvals', pendingTrainers: pending.rows });
    } catch(e) { res.render('pages/admin-approvals', { title: 'Aprovações', active: 'approvals', pendingTrainers: [] }); }
});

router.post('/approve-trainer/:id', async (req, res) => {
    await db.query("UPDATE trainers SET approval_status = 'approved' WHERE id = $1", [req.params.id]);
    res.redirect('/admin/approvals?success=aprovado');
});
router.post('/reject-trainer/:id', async (req, res) => {
    await db.query("UPDATE trainers SET approval_status = 'rejected' WHERE id = $1", [req.params.id]);
    res.redirect('/admin/approvals?success=rejeitado');
});

// 4. CONTEÚDO
router.get('/content', async (req, res) => {
    try {
        const articles = await db.query("SELECT id, title, category, status, views FROM articles ORDER BY created_at DESC");
        res.render('pages/admin-content', { title: 'Conteúdo', active: 'content', articles: articles.rows });
    } catch(e) { res.render('pages/admin-content', { title: 'Conteúdo', active: 'content', articles: [] }); }
});

// 5. FINANCEIRO
router.get('/finance', (req, res) => {
    // Dados Mockados para MVP
    res.render('pages/admin-finance', { 
        title: 'Financeiro', active: 'finance',
        revenue: 15450.00,
        transactions: [
            { id: 1, user: 'João S.', plan: 'Pro', amount: 59.90, status: 'Pago' },
            { id: 2, user: 'Maria T.', plan: 'Start', amount: 29.90, status: 'Pago' },
            { id: 3, user: 'Carlos E.', plan: 'Elite', amount: 99.90, status: 'Pendente' }
        ]
    });
});

// 6. PLANOS
router.get('/plans', (req, res) => {
    res.render('pages/admin-plans', { 
        title: 'Planos', active: 'plans',
        plans: [
            { name: 'Fit Start', price: 29.90, active: true },
            { name: 'Pro Evolution', price: 59.90, active: true },
            { name: 'Elite Personal', price: 99.90, active: false }
        ]
    });
});

// 7. IA AUDIT
router.get('/ia-audit', (req, res) => {
    res.render('pages/admin-ia-audit', { title: 'IA Audit', active: 'ia-audit', logs: [] });
});

// 8. CONFIGURAÇÕES
router.get('/settings', (req, res) => {
    res.render('pages/admin-settings', { 
        title: 'Configurações', active: 'settings', 
        config: { maintenance: false, registrations: true }
    });
});

module.exports = router;
