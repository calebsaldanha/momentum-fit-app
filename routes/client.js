const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getChatResponse } = require('../utils/aiService');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } }));

router.get('/workouts', async (req, res) => {
    const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/client-workouts', { workouts: workouts.rows });
});

// Rota de Planos (O QUE FALTAVA)
router.get('/plans', async (req, res) => {
    const plans = await db.query("SELECT * FROM plans ORDER BY price ASC");
    res.render('pages/client-plans', { plans: plans.rows });
});

// Rota de Conteúdo (O QUE FALTAVA)
router.get('/content', async (req, res) => {
    const articles = await db.query("SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC");
    res.render('pages/client-content', { articles: articles.rows });
});

router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.post('/ai-coach/message', async (req, res) => {
    const response = await getChatResponse(req.session.user.id, req.body.message);
    res.json({ response });
});

router.get('/profile', async (req, res) => {
    const result = await db.query("SELECT u.*, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1", [req.session.user.id]);
    const subscription = { plan: 'Free', price: '0,00' }; // Mock
    res.render('pages/client-profile', { client: result.rows[0] || {}, subscription });
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution'));
router.get('/settings', (req, res) => res.render('pages/client-settings'));

module.exports = router;
