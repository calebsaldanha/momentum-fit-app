const express = require('express');
const router = express.Router();

const isClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    if (req.session.user && req.session.user.role === 'trainer') return res.redirect('/trainer/dashboard');
    res.redirect('/auth/login');
};

router.use(isClient);

router.get('/dashboard', (req, res) => {
    // DADOS MOCKADOS PARA TESTE VISUAL
    const stats = {
        workoutsCompleted: 8,
        streak: 3,
        currentWeight: 71.2
    };

    const nextWorkout = {
        id: 101,
        title: 'Full Body Power',
        description: 'Treino de corpo inteiro com foco em compostos.',
        duration: 50,
        exerciseCount: 6,
        intensity: 'Alta'
    };

    res.render('pages/client-dashboard', {
        user: req.session.user,
        path: req.originalUrl,
        title: 'Visão Geral',
        stats: stats,
        nextWorkout: nextWorkout,
        notifications: []
    });
});

// Outras rotas...
const renderPlaceholder = (res, req, title) => {
    res.render('pages/error', { message: title + ' - Em Breve' });
};

router.get('/workouts', (req, res) => renderPlaceholder(res, req, 'Treinos'));
router.get('/evolution', (req, res) => renderPlaceholder(res, req, 'Evolução'));
router.get('/ai-coach', (req, res) => renderPlaceholder(res, req, 'IA Coach'));
router.get('/diet', (req, res) => renderPlaceholder(res, req, 'Dieta'));
router.get('/settings', (req, res) => {
    res.render('pages/client-settings', {
        user: req.session.user,
        path: req.originalUrl,
        title: 'Configurações',
        notifications: []
    });
});

module.exports = router;
