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
    // Mock para dashboard
    res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } });
});

// Treinos Lista
router.get('/workouts', async (req, res) => {
    const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/client-workouts', { workouts: workouts.rows });
});

// IA Coach
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));

// Perfil (Dados completos)
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date,
                   c.weight, c.height, c.goal, c.medical_history, c.activity_level, c.limitations
            FROM users u
            JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        // Simulação de Assinatura
        const subscription = { plan: 'Free', status: 'Ativo', next_billing: '25/02/2026', price: '0,00' };

        res.render('pages/client-profile', { client: result.rows[0] || {}, subscription });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

router.post('/profile', async (req, res) => {
    // Implementar update logic aqui (similar ao trainer)
    req.flash('success', 'Dados atualizados (Simulação)');
    res.redirect('/client/profile');
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution'));
router.get('/settings', (req, res) => res.render('pages/client-settings'));

module.exports = router;
