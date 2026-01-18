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
            stats: { totalClients: clients.rows[0].count, activeClients: clients.rows[0].count }, // Simplificado
            recentClients: [] 
        });
    } catch (err) {
        res.render('pages/trainer-dashboard', { stats: { totalClients: 0, activeClients: 0 }, recentClients: [] });
    }
});

// Agenda
router.get('/schedule', (req, res) => {
    res.render('pages/trainer-schedule');
});

// Biblioteca (CORREÇÃO DO LOOP: removido redirecionamento recursivo)
router.get('/library', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM exercise_library WHERE created_by = $1 OR created_by IS NULL", [req.session.user.id]);
        res.render('pages/trainer-library', { exercises: result.rows });
    } catch (err) {
        console.error(err);
        res.render('pages/trainer-library', { exercises: [], messages: { error: 'Erro ao carregar exercícios.' } });
    }
});

// Conteúdo
router.get('/content', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM articles WHERE author_id = $1", [req.session.user.id]);
        res.render('pages/trainer-content', { articles: result.rows });
    } catch (err) {
        res.render('pages/trainer-content', { articles: [] });
    }
});

// Perfil (GET & POST)
router.get('/profile', async (req, res) => {
    try {
        // JOIN para pegar dados de users e trainers
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date, u.photo_url, 
                   t.specialties, t.bio, t.education, t.experience, t.is_approved
            FROM users u
            JOIN trainers t ON u.id = t.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        res.render('pages/trainer-profile', { trainer: result.rows[0] });
    } catch (err) {
        console.error(err);
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
        req.flash('success', 'Perfil atualizado!');
        res.redirect('/trainer/profile');
    } catch (err) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao atualizar.');
        res.redirect('/trainer/profile');
    }
});

// Financeiro (GET & POST para Chave Pix)
router.get('/financial', async (req, res) => {
    try {
        const result = await db.query("SELECT pix_key, pix_key_type, price_monthly FROM trainers WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/trainer-financial', { data: result.rows[0], revenue: { total: 0 }, transactions: [] });
    } catch (err) {
        res.redirect('/trainer/dashboard');
    }
});

router.post('/financial', async (req, res) => {
    const { pix_key, pix_key_type, price_monthly } = req.body;
    try {
        await db.query("UPDATE trainers SET pix_key = $1, pix_key_type = $2, price_monthly = $3 WHERE user_id = $4", 
            [pix_key, pix_key_type, price_monthly, req.session.user.id]);
        req.flash('success', 'Dados financeiros salvos.');
        res.redirect('/trainer/financial');
    } catch (err) {
        req.flash('error', 'Erro ao salvar.');
        res.redirect('/trainer/financial');
    }
});

// Clients List
router.get('/clients', async (req, res) => {
    const result = await db.query("SELECT * FROM users WHERE trainer_id = $1", [req.session.user.id]);
    res.render('pages/trainer-clients', { clients: result.rows });
});

module.exports = router;
