const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Middleware
function isAdmin(req, res, next) {
    if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    req.flash('error', 'Acesso Restrito.');
    res.redirect('/auth/login');
}
router.use(isAdmin);

// === DASHBOARD ===
router.get('/dashboard', async (req, res) => {
    try {
        const [usersRes, subsRes, trainersRes, recentRes] = await Promise.all([
            db.query("SELECT COUNT(*) FROM users"),
            db.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'"),
            db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer' AND status = 'pending_approval'"),
            db.query("SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 8")
        ]);

        res.render('pages/admin-dashboard', { 
            stats: {
                totalUsers: usersRes.rows[0].count,
                activeSubs: subsRes.rows[0].count,
                pendingTrainers: trainersRes.rows[0].count
            }, 
            recentUsers: recentRes.rows 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/admin-dashboard', { stats: {}, recentUsers: [] });
    }
});

// === FINANCEIRO ===
router.get('/finance', async (req, res) => {
    try {
        const pending = await db.query(`
            SELECT p.*, u.name as user_name, u.email as user_email, pl.name as plan_name 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN subscriptions s ON p.subscription_id = s.id
            LEFT JOIN plans pl ON s.plan_id = pl.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
        `);
        res.render('pages/admin-finance', { pendingPayments: pending.rows });
    } catch(e) {
        res.render('pages/admin-finance', { pendingPayments: [] });
    }
});

router.post('/finance/approve/:id', async (req, res) => {
    try {
        await db.query('BEGIN');
        const payRes = await db.query("UPDATE payments SET status = 'paid', payment_date = NOW() WHERE id = $1 RETURNING subscription_id", [req.params.id]);
        if(payRes.rows.length > 0) {
            await db.query("UPDATE subscriptions SET status = 'active' WHERE id = $1", [payRes.rows[0].subscription_id]);
        }
        await db.query('COMMIT');
        req.flash('success', 'Pagamento aprovado.');
    } catch(e) { 
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao aprovar.'); 
    }
    res.redirect('/admin/finance');
});

// === AUDITORIA IA ===
router.get('/ia-audit', async (req, res) => {
    try {
        const logs = await db.query(`
            SELECT l.*, u.name as user_name 
            FROM ai_audit_logs l 
            LEFT JOIN users u ON l.user_id = u.id 
            ORDER BY l.created_at DESC LIMIT 100
        `);
        res.render('pages/admin-ia-audit', { logs: logs.rows });
    } catch(e) {
        res.render('pages/admin-ia-audit', { logs: [] });
    }
});

// === CONTEÚDO ===
router.get('/content', async (req, res) => {
    try {
        const settingsRes = await db.query('SELECT * FROM system_settings');
        const settings = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);

        const articlesRes = await db.query(`
            SELECT a.*, u.name as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            ORDER BY a.created_at DESC
        `);

        res.render('pages/admin-content', { settings, articles: articlesRes.rows });
    } catch(e) {
        res.redirect('/admin/dashboard');
    }
});

router.post('/content/update-settings', async (req, res) => {
    const { site_home_title, site_about_text } = req.body;
    await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_home_title', site_home_title]);
    await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_about_text', site_about_text]);
    req.flash('success', 'Configurações salvas.');
    res.redirect('/admin/content');
});

router.post('/articles/status/:id', async (req, res) => {
    const { status } = req.body;
    await db.query('UPDATE articles SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.redirect('/admin/content');
});

router.post('/articles/delete/:id', async (req, res) => {
    await db.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    res.redirect('/admin/content');
});

// === DETALHES DE USUÁRIO (RESTORED FULL) ===
router.get('/users/:id', async (req, res) => {
    try {
        // 1. Dados Básicos
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if(userRes.rows.length === 0) return res.redirect('/admin/users');
        
        // 2. Dados Completos da Anamnese (Clients)
        const clientRes = await db.query('SELECT * FROM clients WHERE user_id = $1', [req.params.id]);
        
        // 3. Histórico de Assinaturas
        const subRes = await db.query(`
            SELECT s.*, p.name as plan_name, p.price 
            FROM subscriptions s 
            LEFT JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 
            ORDER BY s.start_date DESC
        `, [req.params.id]);

        // 4. Histórico de Pagamentos (Novo)
        const payRes = await db.query(`
            SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC
        `, [req.params.id]);

        res.render('pages/admin-user-details', { 
            targetUser: userRes.rows[0], 
            clientData: clientRes.rows[0] || {}, 
            subscriptions: subRes.rows,
            payments: payRes.rows
        });
    } catch(e) {
        console.error("Erro User Details:", e);
        res.redirect('/admin/users');
    }
});

// === SETTINGS ===
router.get('/settings', async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM system_settings');
        const settings = {};
        r.rows.forEach(i => settings[i.key] = i.value);
        res.render('pages/admin-settings', { settings });
    } catch(e) { res.render('pages/admin-settings', { settings: {} }); }
});

router.post('/settings/general', async (req, res) => {
    const { pix_key } = req.body;
    await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['pix_key', pix_key]);
    req.flash('success', 'Pix atualizado.');
    res.redirect('/admin/settings');
});

router.post('/settings/password', async (req, res) => {
    const { new_password } = req.body;
    if(new_password.length < 6) { req.flash('error', 'Senha curta.'); return res.redirect('/admin/settings'); }
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.session.user.id]);
    req.flash('success', 'Senha alterada.');
    res.redirect('/admin/settings');
});

// === USERS ===
router.get('/users', async (req, res) => {
    const u = await db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT 50");
    res.render('pages/admin-users', { users: u.rows });
});

router.get('/approvals', async (req, res) => {
    const p = await db.query("SELECT * FROM users WHERE role='trainer' AND status='pending_approval'");
    res.render('pages/admin-approvals', { pendingTrainers: p.rows });
});

router.post('/users/approve/:id', async (req, res) => {
    await db.query("UPDATE users SET status='active' WHERE id=$1", [req.params.id]);
    res.redirect('/admin/approvals');
});

router.post('/users/reject/:id', async (req, res) => {
    await db.query("UPDATE users SET status='rejected' WHERE id=$1", [req.params.id]);
    res.redirect('/admin/approvals');
});

// === PLANOS & EXERCÍCIOS ===
router.get('/plans', async (req, res) => {
    const p = await db.query('SELECT * FROM plans ORDER BY price ASC');
    res.render('pages/admin-plans', { plans: p.rows });
});
router.post('/plans/create', async (req, res) => {
    const { name, price, description } = req.body;
    await db.query('INSERT INTO plans (name, price, description, is_active) VALUES ($1, $2, $3, true)', [name, price, description]);
    res.redirect('/admin/plans');
});
router.post('/plans/delete/:id', async (req, res) => {
    await db.query('UPDATE plans SET is_active = false WHERE id = $1', [req.params.id]);
    res.redirect('/admin/plans');
});

router.get('/exercises', async (req, res) => {
    const e = await db.query("SELECT * FROM exercise_library ORDER BY name");
    res.render('pages/admin-exercises', { exercises: e.rows });
});
router.post('/exercises/create', async (req, res) => {
    const { name, muscle_group } = req.body;
    await db.query("INSERT INTO exercise_library (name, muscle_group) VALUES ($1, $2)", [name, muscle_group]);
    res.redirect('/admin/exercises');
});
router.post('/exercises/delete/:id', async (req, res) => {
    await db.query("DELETE FROM exercise_library WHERE id = $1", [req.params.id]);
    res.redirect('/admin/exercises');
});

module.exports = router;
