const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware para garantir que é cliente
const isClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') {
        return next();
    }
    // Se for trainer tentando acessar, redireciona para trainer dashboard
    if (req.session.user && req.session.user.role === 'trainer') {
        return res.redirect('/trainer/dashboard');
    }
    res.redirect('/auth/login');
};

router.use(isClient);

// Dashboard
router.get('/dashboard', (req, res) => {
    // MOCK DATA - Substituir por queries reais do banco futuramente
    const stats = {
        workoutsCompleted: 12,
        streak: 4,
        currentWeight: 71.5
    };

    const nextWorkout = {
        id: 1,
        title: 'Hipertrofia A - Peito e Tríceps',
        category: 'Força',
        description: 'Foco na fase excêntrica do movimento. Carga moderada a alta.',
        duration: 50,
        exerciseCount: 7,
        intensity: 'Alta'
    };

    res.render('pages/client-dashboard', {
        user: req.session.user,
        path: req.path,
        stats: stats,
        nextWorkout: nextWorkout, // Passe null se não houver treino
        title: 'Dashboard'
    });
});

// Placeholders para outras rotas do menu
router.get('/workouts', (req, res) => {
    res.render('pages/error', { message: 'Página de Treinos em construção (Fase 4)' });
});

router.get('/evolution', (req, res) => {
    res.render('pages/error', { message: 'Página de Evolução em construção' });
});

router.get('/ai-coach', (req, res) => {
    res.render('pages/error', { message: 'IA Coach em construção' });
});

router.get('/diet', (req, res) => {
    res.render('pages/error', { message: 'Nutrição em construção' });
});

router.get('/settings', (req, res) => {
    res.render('pages/client-settings', { // Assegure-se que este arquivo existe ou use placeholder
        user: req.session.user,
        path: req.path,
        title: 'Configurações'
    });
});

module.exports = router;
