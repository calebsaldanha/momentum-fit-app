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

router.get('/dashboard', (req, res) => res.render('pages/admin-dashboard'));

// === FINANCEIRO ADMIN ===
router.get('/finance', async (req, res) => {
    try {
        // Pagamentos Pendentes
        const pending = await db.query(`
            SELECT py.*, u.name as user_name, u.email, pl.name as plan_name 
            FROM payments py
            JOIN users u ON py.user_id = u.id
            LEFT JOIN subscriptions s ON py.subscription_id = s.id
            LEFT JOIN plans pl ON s.plan_id = pl.id
            WHERE py.status = 'pending'
            ORDER BY py.created_at ASC
        `);

        // Assinaturas Ativas
        const activeSubs = await db.query(`
            SELECT s.*, u.name as user_name, pl.name as plan_name 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans pl ON s.plan_id = pl.id
            WHERE s.status = 'active'
        `);

        res.render('pages/admin-finance', { 
            pendingPayments: pending.rows,
            activeSubscriptions: activeSubs.rows
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/dashboard');
    }
});

// Aprovar Pagamento
router.post('/finance/approve', async (req, res) => {
    const { payment_id } = req.body;
    try {
        await db.query('BEGIN');
        
        // 1. Atualizar Pagamento para 'paid'
        const payRes = await db.query(`
            UPDATE payments SET status = 'paid', payment_date = NOW() 
            WHERE id = $1 RETURNING subscription_id
        `, [payment_id]);
        
        const subId = payRes.rows[0].subscription_id;

        // 2. Ativar Assinatura
        await db.query(`UPDATE subscriptions SET status = 'active' WHERE id = $1`, [subId]);

        await db.query('COMMIT');
        req.flash('success', 'Pagamento aprovado e plano ativado.');
    } catch (e) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao aprovar.');
    }
    res.redirect('/admin/finance');
});

// Rejeitar Pagamento
router.post('/finance/reject', async (req, res) => {
    const { payment_id } = req.body;
    try {
        await db.query("UPDATE payments SET status = 'rejected' WHERE id = $1", [payment_id]);
        req.flash('success', 'Pagamento rejeitado.');
    } catch (e) {
        req.flash('error', 'Erro ao rejeitar.');
    }
    res.redirect('/admin/finance');
});

// Suspender Plano
router.post('/finance/suspend', async (req, res) => {
    const { subscription_id } = req.body;
    try {
        await db.query("UPDATE subscriptions SET status = 'suspended' WHERE id = $1", [subscription_id]);
        req.flash('success', 'Assinatura suspensa.');
    } catch (e) {
        req.flash('error', 'Erro ao suspender.');
    }
    res.redirect('/admin/finance');
});

// Rebaixar para Free (Cancelar Assinatura Atual)
router.post('/finance/downgrade', async (req, res) => {
    const { subscription_id } = req.body;
    try {
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [subscription_id]);
        req.flash('success', 'Assinatura cancelada (Downgrade para Free).');
    } catch (e) {
        req.flash('error', 'Erro ao realizar downgrade.');
    }
    res.redirect('/admin/finance');
});

// Outras rotas Admin (Mock)
router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { pendingTrainers: [] }));
router.get('/users', (req, res) => res.render('pages/admin-user-details', { users: [] }));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit'));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));

module.exports = router;
