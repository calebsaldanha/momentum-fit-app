const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

function isAdmin(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(isAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        const totalClients = await db.query("SELECT COUNT(*) FROM users WHERE role = 'client'");
        const totalTrainers = await db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer'");
        const revenue = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND payment_date > NOW() - INTERVAL '30 days'`);
        const pendingPayments = await db.query("SELECT COUNT(*) FROM payments WHERE status = 'pending'");
        const recentUsers = await db.query("SELECT id, name, email, role, created_at, status FROM users ORDER BY created_at DESC LIMIT 5");

        const stats = {
            clients: totalClients.rows[0].count,
            trainers: totalTrainers.rows[0].count,
            revenue: revenue.rows[0].total,
            pending: pendingPayments.rows[0].count
        };
        res.render('pages/admin-dashboard', { stats, recentUsers: recentUsers.rows });
    } catch (err) {
        res.render('pages/admin-dashboard', { stats: { clients:0, trainers:0, revenue:0, pending:0 }, recentUsers: [] });
    }
});

router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM users ORDER BY created_at DESC");
        res.render('pages/admin-users', { users: result.rows });
    } catch(e) { res.redirect('/admin/dashboard'); }
});

router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.redirect('/admin/users');
        const targetUser = userRes.rows[0];

        let details = {};
        if (targetUser.role === 'client') {
            const clientRes = await db.query("SELECT * FROM clients WHERE user_id = $1", [id]);
            details = clientRes.rows[0] || {};
            details.goal = details.fitness_goals || details.goal || ''; 
        } else if (targetUser.role === 'trainer') {
            const trainerRes = await db.query("SELECT * FROM trainers WHERE user_id = $1", [id]);
            details = trainerRes.rows[0] || {};
        }

        // Buscar Planos Ativos
        const plans = await db.query("SELECT * FROM plans WHERE is_active = true ORDER BY price ASC");
        
        const trainers = await db.query("SELECT id, name FROM users WHERE role = 'trainer' AND status = 'active'");
        
        let workouts = [], financials = [], activeSub = null;

        if (targetUser.role === 'client') {
            const wRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [id]);
            workouts = wRes.rows;

            const fRes = await db.query(`
                SELECT p.*, pl.name as plan_name 
                FROM payments p 
                LEFT JOIN subscriptions s ON p.subscription_id = s.id 
                LEFT JOIN plans pl ON s.plan_id = pl.id 
                WHERE p.user_id = $1 
                ORDER BY p.created_at DESC
            `, [id]);
            financials = fRes.rows;

            const subRes = await db.query(`
                SELECT s.*, p.name as plan_name, p.price, p.id as plan_id 
                FROM subscriptions s 
                JOIN plans p ON s.plan_id = p.id 
                WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment', 'past_due')
                ORDER BY s.start_date DESC LIMIT 1
            `, [id]);
            activeSub = subRes.rows[0] || null;
        }

        res.render('pages/admin-user-details', { 
            targetUser, details, 
            plans: plans.rows,  // CRUCIAL: Passa a lista de planos para o EJS
            trainers: trainers.rows,
            workouts,
            payments: financials,
            subscription: activeSub
        });

    } catch(e) {
        console.error("Admin User Details Error:", e);
        res.redirect('/admin/users');
    }
});

// Post routes...
router.post('/users/:id/suspend', async (req, res) => { try { await db.query("UPDATE users SET status = $1 WHERE id = $2", [req.body.status, req.params.id]); req.flash('success', 'Status atualizado.'); } catch(e){} res.redirect(`/admin/users/${req.params.id}`); });
router.post('/users/:id/delete', async (req, res) => { try { await db.query("DELETE FROM users WHERE id = $1", [req.params.id]); req.flash('success', 'Excluído.'); res.redirect('/admin/users'); } catch(e){ res.redirect(`/admin/users/${req.params.id}`); } });
router.post('/users/:id/reset-password', async (req, res) => { try { const hash = await bcrypt.hash(req.body.new_password, 10); await db.query("UPDATE users SET password = $1 WHERE id = $2", [hash, req.params.id]); req.flash('success', 'Senha alterada.'); } catch(e){} res.redirect(`/admin/users/${req.params.id}`); });
router.post('/users/:id/change-plan', async (req, res) => { try { await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1", [req.params.id]); await db.query("INSERT INTO subscriptions (user_id, plan_id, status, start_date) VALUES ($1, $2, 'active', NOW())", [req.params.id, req.body.plan_id]); req.flash('success', 'Plano alterado.'); } catch(e){ req.flash('error', 'Erro ao mudar plano.'); } res.redirect(`/admin/users/${req.params.id}`); });
router.post('/users/:id/assign-trainer', async (req, res) => { try { await db.query("UPDATE users SET trainer_id = $1 WHERE id = $2", [req.body.trainer_id, req.params.id]); await db.query("UPDATE client_profiles SET assigned_trainer_id = $1 WHERE user_id = $2", [req.body.trainer_id, req.params.id]); req.flash('success', 'Personal atribuído.'); } catch(e){} res.redirect(`/admin/users/${req.params.id}`); });
router.post('/users/:id/send-reminder', async (req, res) => { req.flash('success', 'Lembrete enviado.'); res.redirect(`/admin/users/${req.params.id}`); });

// Financeiro
router.get('/finance', async (req, res) => {
    try {
        const pending = await db.query("SELECT py.*, u.name as user_name, u.email, pl.name as plan_name FROM payments py JOIN users u ON py.user_id = u.id LEFT JOIN subscriptions s ON py.subscription_id = s.id LEFT JOIN plans pl ON s.plan_id = pl.id WHERE py.status = 'pending' ORDER BY py.created_at ASC");
        const activeSubs = await db.query("SELECT s.*, u.name as user_name, pl.name as plan_name FROM subscriptions s JOIN users u ON s.user_id = u.id JOIN plans pl ON s.plan_id = pl.id WHERE s.status = 'active'");
        res.render('pages/admin-finance', { pendingPayments: pending.rows, activeSubscriptions: activeSubs.rows });
    } catch (e) { res.redirect('/admin/dashboard'); }
});
router.post('/finance/approve', async (req, res) => { try { await db.query('BEGIN'); const r = await db.query(`UPDATE payments SET status='paid', payment_date=NOW() WHERE id=$1 RETURNING subscription_id`,[req.body.payment_id]); if(r.rows.length) await db.query("UPDATE subscriptions SET status='active' WHERE id=$1",[r.rows[0].subscription_id]); await db.query('COMMIT'); req.flash('success','Aprovado'); } catch(e){await db.query('ROLLBACK');} res.redirect('/admin/finance'); });
router.post('/finance/reject', async (req, res) => { try{await db.query("UPDATE payments SET status='rejected' WHERE id=$1",[req.body.payment_id]); req.flash('success','Rejeitado');}catch(e){} res.redirect('/admin/finance'); });
router.post('/finance/suspend', async (req, res) => { try{await db.query("UPDATE subscriptions SET status='suspended' WHERE id=$1",[req.body.subscription_id]); req.flash('success','Suspenso');}catch(e){} res.redirect('/admin/finance'); });
router.post('/finance/downgrade', async (req, res) => { try{await db.query("UPDATE subscriptions SET status='cancelled' WHERE id=$1",[req.body.subscription_id]); req.flash('success','Cancelado');}catch(e){} res.redirect('/admin/finance'); });

// Content
router.get('/content', async (req, res) => { try { const r = await db.query("SELECT a.*, u.name as author_name FROM articles a LEFT JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC"); res.render('pages/admin-content', { articles: r.rows }); } catch(e){ res.render('pages/admin-content', { articles: [] }); } });
router.get('/content/create', (req, res) => { res.render('pages/create-article'); });
router.post('/content/create', async (req, res) => { const { title, category, content, image_url } = req.body; try { await db.query("INSERT INTO articles (title, category, content, image_url, author_id, status) VALUES ($1, $2, $3, $4, $5, 'published')", [title, category, content, image_url, req.session.user.id]); req.flash('success', 'Artigo publicado!'); res.redirect('/admin/content'); } catch (e) { req.flash('error', 'Erro ao publicar.'); res.redirect('/admin/content/create'); } });
router.post('/content/delete', async (req, res) => { try { await db.query("DELETE FROM articles WHERE id = $1", [req.body.article_id]); req.flash('success', 'Excluído.'); } catch(e){} res.redirect('/admin/content'); });
router.post('/content/suspend', async (req, res) => { try { await db.query("UPDATE articles SET status = 'suspended' WHERE id = $1", [req.body.article_id]); req.flash('success', 'Suspenso.'); } catch(e){} res.redirect('/admin/content'); });
router.post('/content/approve', async (req, res) => { try { await db.query("UPDATE articles SET status = 'published' WHERE id = $1", [req.body.article_id]); req.flash('success', 'Publicado.'); } catch(e){} res.redirect('/admin/content'); });

router.get('/ia-audit', async (req, res) => { try { const r = await db.query("SELECT l.*, u.name as user_name FROM ia_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 100"); res.render('pages/admin-ia-audit', { logs: r.rows }); } catch(e){ res.render('pages/admin-ia-audit', { logs: [] }); } });
router.get('/approvals', (req, res) => res.render('pages/admin-approvals', { pendingTrainers: [] }));
router.get('/settings', (req, res) => res.render('pages/admin-settings'));

module.exports = router;
