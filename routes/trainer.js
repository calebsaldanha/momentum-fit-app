const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isTrainer(req, res, next) {
    if (req.session.user && req.session.user.role === 'trainer') return next();
    res.redirect('/auth/login');
}

router.use(isTrainer);

router.get('/dashboard', async (req, res) => {
    // Lógica simplificada para evitar erros se tabela vazia
    res.render('pages/trainer-dashboard', { stats: { totalClients: 0, activeClients: 0 }, recentClients: [] });
});

router.get('/clients', async (req, res) => {
    const result = await db.query("SELECT * FROM users WHERE trainer_id = $1", [req.session.user.id]);
    res.render('pages/trainer-clients', { clients: result.rows });
});

router.get('/library', async (req, res) => {
    const result = await db.query("SELECT * FROM exercise_library WHERE created_by = $1 OR created_by IS NULL", [req.session.user.id]);
    res.render('pages/trainer-library', { exercises: result.rows });
});

router.get('/content', (req, res) => {
    res.render('pages/trainer-content');
});

router.get('/financial', (req, res) => {
    res.render('pages/trainer-financial', { revenue: { total: 0 }, transactions: [] });
});

router.get('/profile', async (req, res) => {
    const trainer = await db.query("SELECT * FROM trainers WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/trainer-profile', { trainerData: trainer.rows[0] || {} });
});

// Agenda
router.get('/schedule', (req, res) => {
    res.render('pages/trainer-schedule');
});

// Configurações
router.get('/settings', (req, res) => {
    res.render('pages/trainer-settings');
});

module.exports = router;
