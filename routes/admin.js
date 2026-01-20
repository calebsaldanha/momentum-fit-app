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

// === LISTA DE USUÁRIOS ===
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users ORDER BY created_at DESC");
        // Renderiza a nova view de lista, não a de detalhes
        res.render('pages/admin-users', { users: result.rows });
    } catch(e) {
        console.error(e);
        res.redirect('/admin/dashboard');
    }
});

// === DETALHES DO USUÁRIO ===
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Buscar usuário base
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.redirect('/admin/users');
        
        const targetUser = userRes.rows[0];
        let details = {};

        // 2. Buscar detalhes específicos baseados na role
        if (targetUser.role === 'client') {
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [id]);
            details = clientRes.rows[0] || {};
            // Mock de propriedades se não existirem para evitar erro no EJS
            details.goal = details.goal || details.fitness_goals || '';
        } else if (targetUser.role === 'trainer') {
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [id]);
            details = trainerRes.rows[0] || {};
        }

        // 3. Renderizar view de detalhes passando 'targetUser'
        res.render('pages/admin-user-details', { targetUser, details });
    } catch(e) {
        console.error("Erro user details:", e);
        res.redirect('/admin/users');
    }
});

// === FINANCEIRO ADMIN ===
router.get('/finance', async (req, res) => {
    try {
        const pending = await db.query(`
            SELECT py.*, u.name as user_name, u.email, pl.name as plan_name 
            FROM payments py
            JOIN users u ON py.user_id = u.id
            LEFT JOIN subscriptions s ON py.subscription_id = s.id
            LEFT JOIN plans pl ON s.plan_id = pl.id
            WHERE py.status = 'pending'
            ORDER BY py.created_at ASC
        `);

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

router.post('/finance/approve', async (req, res) => {
    const { payment_id } = req.body;
    try {
        await db.query('BEGIN');
        const payRes = await db.query(`UPDATE payments SET status = 'paid', payment_date = NOW() WHERE id = $1 RETURNING subscription_id`, [payment_id]);
        if(payRes.rows.length > 0) {
            await db.query(`UPDATE subscriptions SET status = 'active' WHERE id = $1`, [payRes.rows[0].subscription_id]);
        }
        await db.query('COMMIT');
        req.flash('success', 'Aprovado.');
    } catch (e) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro.');
    }
    res.redirect('/admin/finance');
});

router.post('/finance/reject', async (req, res) => {
    try {
        await db.query("UPDATE payments SET status = 'rejected' WHERE id = $1", [req.body.payment_id]);
        req.flash('success', 'Rejeitado.');
    } catch (e) { req.flash('error', 'Erro.'); }
    res.redirect('/admin/finance');
});

router.post('/finance/suspend', async (req, res) => {
    try {
        await db.query("UPDATE subscriptions SET status = 'suspended' WHERE id = $1", [req.body.subscription_id]);
        req.flash('success', 'Suspenso.');
    } catch (e) { req.flash('error', 'Erro.'); }
    res.redirect('/admin/finance');
});

router.post('/finance/downgrade', async (req, res) => {
    try {
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [req.body.subscription_id]);
        req.flash('success', 'Cancelado.');
    } catch (e) { req.flash('error', 'Erro.'); }
    res.redirect('/admin/finance');
});

router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { pendingTrainers: [] }));
router.get('/content', (req, res) => res.render('pages/admin-content'));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit'));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));

module.exports = router;
