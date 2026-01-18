const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isTrainer(req, res, next) {
    if (req.session.user && req.session.user.role === 'trainer') return next();
    res.redirect('/auth/login');
}

router.use(isTrainer);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const clients = await db.query("SELECT COUNT(*) FROM users WHERE trainer_id = $1", [req.session.user.id]);
        res.render('pages/trainer-dashboard', { 
            stats: { totalClients: clients.rows[0].count, activeClients: clients.rows[0].count }
        });
    } catch (err) {
        res.render('pages/trainer-dashboard', { stats: { totalClients: 0, activeClients: 0 } });
    }
});

// --- AGENDA ---
router.get('/schedule', async (req, res) => {
    try {
        const events = await db.query("SELECT * FROM trainer_schedule WHERE trainer_id = $1 ORDER BY day_of_week, start_time", [req.session.user.id]);
        res.render('pages/trainer-schedule', { events: events.rows });
    } catch (err) {
        res.render('pages/trainer-schedule', { events: [] });
    }
});

router.post('/schedule/create', async (req, res) => {
    const { title, day, start, end } = req.body;
    try {
        await db.query("INSERT INTO trainer_schedule (trainer_id, title, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5)", 
            [req.session.user.id, title, day, start, end]);
        req.flash('success', 'Evento adicionado!');
    } catch (err) {
        req.flash('error', 'Erro ao criar evento.');
    }
    res.redirect('/trainer/schedule');
});

// --- BIBLIOTECA ---
router.get('/library', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM exercise_library WHERE created_by = $1 OR created_by IS NULL ORDER BY name", [req.session.user.id]);
        res.render('pages/trainer-library', { exercises: result.rows });
    } catch (err) {
        res.render('pages/trainer-library', { exercises: [] });
    }
});

router.post('/library/create', async (req, res) => {
    const { name, muscle_group, video_url } = req.body;
    try {
        await db.query("INSERT INTO exercise_library (name, muscle_group, video_url, created_by) VALUES ($1, $2, $3, $4)", 
            [name, muscle_group, video_url, req.session.user.id]);
        req.flash('success', 'Exercício criado!');
    } catch (err) {
        req.flash('error', 'Erro ao criar exercício.');
    }
    res.redirect('/trainer/library');
});

// --- CONTEÚDO (ARTIGOS) ---
router.get('/content', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM articles WHERE author_id = $1", [req.session.user.id]);
        res.render('pages/trainer-content', { articles: result.rows });
    } catch (err) {
        res.render('pages/trainer-content', { articles: [] });
    }
});

router.post('/content/create', async (req, res) => {
    const { title, summary, content } = req.body;
    try {
        await db.query("INSERT INTO articles (title, summary, content, author_id, status) VALUES ($1, $2, $3, $4, 'draft')", 
            [title, summary, content, req.session.user.id]);
        req.flash('success', 'Artigo salvo como rascunho!');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao salvar artigo.');
    }
    res.redirect('/trainer/content');
});

// --- PERFIL ---
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, t.* FROM users u JOIN trainers t ON u.id = t.user_id 
            WHERE u.id = $1
        `, [req.session.user.id]);
        res.render('pages/trainer-profile', { trainer: result.rows[0] });
    } catch (err) {
        res.redirect('/trainer/dashboard');
    }
});

router.post('/profile', async (req, res) => {
    const { name, phone, specialties, bio, education, experience } = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone, req.session.user.id]);
        await db.query('UPDATE trainers SET specialties = $1, bio = $2, education = $3, experience = $4 WHERE user_id = $5', 
            [specialties, bio, education, experience, req.session.user.id]);
        await db.query('COMMIT');
        req.flash('success', 'Perfil atualizado.');
    } catch (err) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao atualizar.');
    }
    res.redirect('/trainer/profile');
});

// --- FINANCEIRO ---
router.get('/financial', async (req, res) => {
    try {
        const result = await db.query("SELECT pix_key, pix_key_type, price_monthly FROM trainers WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/trainer-financial', { data: result.rows[0], revenue: { total: 0 } });
    } catch (err) {
        res.redirect('/trainer/dashboard');
    }
});

router.post('/financial', async (req, res) => {
    const { pix_key, pix_key_type, price_monthly } = req.body;
    try {
        await db.query("UPDATE trainers SET pix_key = $1, pix_key_type = $2, price_monthly = $3 WHERE user_id = $4", 
            [pix_key, pix_key_type, price_monthly, req.session.user.id]);
        req.flash('success', 'Financeiro atualizado.');
    } catch (err) {
        req.flash('error', 'Erro ao atualizar.');
    }
    res.redirect('/trainer/financial');
});

router.get('/clients', async (req, res) => {
    const result = await db.query("SELECT * FROM users WHERE trainer_id = $1", [req.session.user.id]);
    res.render('pages/trainer-clients', { clients: result.rows });
});

router.get('/settings', (req, res) => res.render('pages/trainer-settings'));

module.exports = router;
