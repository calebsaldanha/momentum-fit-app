const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de segurança
const isClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    if (req.session.user && req.session.user.role === 'trainer') return res.redirect('/trainer/dashboard');
    res.redirect('/auth/login');
};

router.use(isClient);

// Rota Auxiliar para renderizar views com dados padrão
const renderApp = (res, req, view, title, extraData = {}) => {
    res.render(view, {
        user: req.session.user,
        path: req.originalUrl, // Usa originalUrl para garantir match correto no sidebar
        title: title,
        notifications: [], // Placeholder
        ...extraData
    });
};

router.get('/dashboard', (req, res) => {
    const stats = { workoutsCompleted: 12, streak: 4, currentWeight: 71.5 };
    const nextWorkout = { 
        id: 1, title: 'Hipertrofia A', category: 'Força', 
        duration: 50, exerciseCount: 7, intensity: 'Alta' 
    };
    renderApp(res, req, 'pages/client-dashboard', 'Visão Geral', { stats, nextWorkout });
});

router.get('/workouts', (req, res) => {
    renderApp(res, req, 'pages/client-workouts', 'Meus Treinos');
});

router.get('/evolution', (req, res) => {
    renderApp(res, req, 'pages/client-evolution', 'Minha Evolução');
});

router.get('/ai-coach', (req, res) => {
    renderApp(res, req, 'pages/client-ai-coach', 'IA Coach');
});

router.get('/diet', (req, res) => {
    // Usando placeholder visual por enquanto
    renderApp(res, req, 'pages/error', 'Nutrição', { message: 'Módulo de Nutrição será liberado na próxima atualização.' });
});

router.get('/settings', (req, res) => {
    renderApp(res, req, 'pages/client-settings', 'Configurações');
});

module.exports = router;
