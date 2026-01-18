const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// Dashboard
router.get('/dashboard', async (req, res) => {
    const stats = { completedWorkouts: 12, checkinsCount: 5 }; // Mock temporário
    res.render('pages/client-dashboard', { stats });
});

// Treinos
router.get('/workouts', async (req, res) => {
    const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/client-workouts', { workouts: workouts.rows });
});

// Evolução
router.get('/evolution', (req, res) => {
    res.render('pages/client-evolution');
});

// IA Coach
router.get('/ai-coach', (req, res) => {
    res.render('pages/client-ai-coach');
});

// Perfil
router.get('/profile', (req, res) => {
    res.render('pages/client-profile');
});

// Configurações (Settings)
router.get('/settings', (req, res) => {
    res.render('pages/client-settings');
});

module.exports = router;
