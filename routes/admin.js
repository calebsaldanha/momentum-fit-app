const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Middleware Admin
function isAdmin(req, res, next) {
    if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }
    req.flash('error', 'Acesso negado.');
    res.redirect('/auth/login');
}

router.use(isAdmin);

// Dashboard
router.get('/dashboard', (req, res) => res.render('pages/admin-dashboard', { stats: {} }));

// === CONFIGURAÇÕES & SENHA ===
router.get('/settings', async (req, res) => {
    try {
        const settingsRes = await db.query('SELECT * FROM system_settings');
        const settings = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);
        
        res.render('pages/admin-settings', { settings });
    } catch(e) {
        console.error(e);
        res.render('pages/admin-settings', { settings: {} });
    }
});

router.post('/settings/general', async (req, res) => {
    const { pix_key, site_contact_email } = req.body;
    try {
        await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['pix_key', pix_key]);
        await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_contact_email', site_contact_email]);
        req.flash('success', 'Configurações gerais atualizadas.');
        res.redirect('/admin/settings');
    } catch(e) {
        console.error(e);
        req.flash('error', 'Erro ao salvar.');
        res.redirect('/admin/settings');
    }
});

router.post('/settings/password', async (req, res) => {
    const { new_password, confirm_password } = req.body;
    if (new_password !== confirm_password) {
        req.flash('error', 'As senhas não coincidem.');
        return res.redirect('/admin/settings');
    }
    try {
        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.session.user.id]);
        req.flash('success', 'Sua senha foi alterada com sucesso.');
        res.redirect('/admin/settings');
    } catch(e) {
        console.error(e);
        req.flash('error', 'Erro ao alterar senha.');
        res.redirect('/admin/settings');
    }
});

// === CONTEÚDO DO SITE ===
router.get('/content', async (req, res) => {
    try {
        const settingsRes = await db.query('SELECT * FROM system_settings');
        const settings = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);
        
        res.render('pages/admin-content', { settings });
    } catch(e) {
        res.redirect('/admin/dashboard');
    }
});

router.post('/content/update', async (req, res) => {
    const { site_home_title, site_about_text } = req.body;
    try {
        await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_home_title', site_home_title]);
        await db.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['site_about_text', site_about_text]);
        req.flash('success', 'Conteúdo do site atualizado.');
        res.redirect('/admin/content');
    } catch(e) {
        req.flash('error', 'Erro ao atualizar conteúdo.');
        res.redirect('/admin/content');
    }
});

// === PLANOS (CRUD) ===
router.get('/plans', async (req, res) => {
    const plans = await db.query('SELECT * FROM plans ORDER BY price ASC');
    res.render('pages/admin-plans', { plans: plans.rows });
});

router.post('/plans/create', async (req, res) => {
    const { name, price, description, features } = req.body;
    try {
        await db.query('INSERT INTO plans (name, price, description, features, is_active) VALUES ($1, $2, $3, $4, true)', 
            [name, price, description, features]);
        req.flash('success', 'Plano criado.');
        res.redirect('/admin/plans');
    } catch(e) { console.error(e); res.redirect('/admin/plans'); }
});

router.post('/plans/delete/:id', async (req, res) => {
    try {
        await db.query('UPDATE plans SET is_active = false WHERE id = $1', [req.params.id]);
        req.flash('success', 'Plano desativado.');
        res.redirect('/admin/plans');
    } catch(e) { res.redirect('/admin/plans'); }
});

// === EXERCÍCIOS (LIBRARY) ===
router.get('/exercises', async (req, res) => {
    try {
        const exercises = await db.query("SELECT * FROM exercise_library ORDER BY name ASC");
        res.render('pages/admin-exercises', { exercises: exercises.rows });
    } catch (e) {
        console.error(e);
        res.redirect('/admin/dashboard');
    }
});

router.post('/exercises/create', async (req, res) => {
    const { name, muscle_group, equipment, difficulty, video_url } = req.body;
    try {
        await db.query(
            "INSERT INTO exercise_library (name, muscle_group, equipment, difficulty, video_url) VALUES ($1, $2, $3, $4, $5)",
            [name, muscle_group, equipment, difficulty, video_url]
        );
        req.flash('success', 'Exercício adicionado.');
        res.redirect('/admin/exercises');
    } catch(e) { req.flash('error', 'Erro ao adicionar exercício.'); res.redirect('/admin/exercises'); }
});

router.post('/exercises/delete/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM exercise_library WHERE id = $1", [req.params.id]);
        req.flash('success', 'Exercício removido.');
        res.redirect('/admin/exercises');
    } catch(e) { req.flash('error', 'Erro ao remover (pode estar em uso).'); res.redirect('/admin/exercises'); }
});

// === USUÁRIOS E APROVAÇÕES ===
router.get('/users', async (req, res) => {
    const users = await db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT 50");
    res.render('pages/admin-users', { users: users.rows });
});

router.get('/approvals', async (req, res) => {
    const pending = await db.query("SELECT u.id, u.name, u.email, u.created_at FROM users u WHERE u.role = 'trainer' AND u.status = 'pending_approval'");
    res.render('pages/admin-approvals', { pendingTrainers: pending.rows });
});

router.post('/users/approve/:id', async (req, res) => {
    await db.query("UPDATE users SET status = 'active' WHERE id = $1", [req.params.id]);
    req.flash('success', 'Usuário aprovado.');
    res.redirect('/admin/approvals');
});

router.post('/users/reject/:id', async (req, res) => {
    await db.query("UPDATE users SET status = 'rejected' WHERE id = $1", [req.params.id]);
    req.flash('success', 'Usuário rejeitado.');
    res.redirect('/admin/approvals');
});

router.get('/finance', (req, res) => res.render('pages/admin-finance'));
router.get('/ia-audit', (req, res) => res.render('pages/admin-ia-audit'));

module.exports = router;
