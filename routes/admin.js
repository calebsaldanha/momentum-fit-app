const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

function isAdmin(req, res, next) {
    if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    req.flash('error', 'Acesso Restrito.');
    res.redirect('/auth/login');
}
router.use(isAdmin);

// === DASHBOARD (CORRIGIDO) ===
router.get('/dashboard', async (req, res) => {
    try {
        // Busca estatísticas em paralelo
        const [usersRes, subsRes, trainersRes, recentRes] = await Promise.all([
            db.query("SELECT COUNT(*) FROM users"),
            db.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'"),
            db.query("SELECT COUNT(*) FROM users WHERE role = 'trainer' AND status = 'pending_approval'"),
            db.query("SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 8")
        ]);

        const stats = {
            totalUsers: usersRes.rows[0].count,
            activeSubs: subsRes.rows[0].count,
            pendingTrainers: trainersRes.rows[0].count
        };

        res.render('pages/admin-dashboard', { 
            stats, 
            recentUsers: recentRes.rows 
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        // Fallback para não quebrar a página se o banco falhar
        res.render('pages/admin-dashboard', { 
            stats: { totalUsers: 0, activeSubs: 0, pendingTrainers: 0 }, 
            recentUsers: [] 
        });
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

// === CONTENT ===
router.get('/content', async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM system_settings');
        const settings = {};
        r.rows.forEach(i => settings[i.key] = i.value);
        res.render('pages/admin-content', { settings });
    } catch(e) { res.redirect('/admin/dashboard'); }
});

router.post('/content/update', async (req, res) => {
    const { site_home_title, site_about_text } = req.body;
    await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_home_title', site_home_title]);
    await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_about_text', site_about_text]);
    req.flash('success', 'Conteúdo atualizado.');
    res.redirect('/admin/content');
});

// === PLANS ===
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

// === EXERCISES ===
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

router.get('/finance', (req, res) => res.render('pages/admin-finance'));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit'));

module.exports = router;
