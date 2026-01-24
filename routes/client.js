const express = require('express');
const router = express.Router();
const db = require('../database/db');
// Importação desestruturada segura
const authMiddleware = require('../middleware/auth');
const ensureAuthenticated = authMiddleware.ensureAuthenticated;
const isClient = authMiddleware.isClient;

// Middleware global para rotas de cliente (Sidebars e User)
router.use(ensureAuthenticated, isClient, (req, res, next) => {
    // Garante perfil vazio se não existir para evitar crash nas views
    if (!req.user.profile) req.user.profile = {};
    res.locals.path = req.path;
    next();
});

// --- ROTAS ---

// 1. Dashboard
router.get('/dashboard', (req, res) => {
    // Dados mockados para evitar tela branca se DB falhar
    const stats = {
        treinos: 0,
        peso: req.user.profile.weight || '--',
        streak: 0
    };
    res.render('pages/client-dashboard', {
        title: 'Visão Geral',
        user: req.user,
        stats: stats
    });
});

// 2. Treinos
router.get('/workouts', (req, res) => {
    res.render('pages/client-workouts', {
        title: 'Meus Treinos',
        user: req.user,
        workouts: []
    });
});

// 3. Evolução
router.get('/evolution', (req, res) => {
    res.render('pages/client-evolution', {
        title: 'Minha Evolução',
        user: req.user
    });
});

// 4. IA Coach
router.get('/ai-coach', (req, res) => {
    res.render('pages/client-ai-coach', {
        title: 'Coach IA',
        user: req.user
    });
});

// 5. Financeiro
router.get('/financial', (req, res) => {
    res.render('pages/client-financial', {
        title: 'Minha Assinatura',
        user: req.user
    });
});

// 6. Perfil
router.get('/profile', (req, res) => {
    res.render('pages/client-profile', {
        title: 'Meu Perfil',
        user: req.user
    });
});

module.exports = router;
