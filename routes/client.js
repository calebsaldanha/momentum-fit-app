const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAuthenticated, isClient } = require('../middleware/auth');

// Middleware global para rotas de cliente
router.use(ensureAuthenticated, isClient, (req, res, next) => {
    // Garante que o user tenha profile
    if (!req.user.profile) {
        req.user.profile = {}; 
    }
    res.locals.path = req.path; // Disponibiliza path para sidebar
    next();
});

// 1. DASHBOARD
router.get('/dashboard', async (req, res) => {
    try {
        // Buscar estatísticas reais ou usar defaults
        // Exemplo: Contar treinos completados este mês
        const stats = {
            workoutsDone: 0,
            currentWeight: req.user.profile.weight || '--',
            streak: 0,
            nextWorkout: 'Descanso'
        };
        
        // Tenta buscar dados reais se as tabelas existirem
        try {
             // Lógica futura de DB aqui
        } catch (dbError) {
            console.warn('Erro ao buscar stats:', dbError.message);
        }

        res.render('pages/client-dashboard', {
            title: 'Visão Geral',
            user: req.user,
            stats: stats
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

// 2. MEUS TREINOS
router.get('/workouts', async (req, res) => {
    try {
        // Mock de treinos por enquanto
        const workouts = []; 
        res.render('pages/client-workouts', {
            title: 'Meus Treinos',
            user: req.user,
            workouts: workouts
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao carregar treinos.' });
    }
});

// 3. EVOLUÇÃO (Gráficos)
router.get('/evolution', async (req, res) => {
    try {
        res.render('pages/client-evolution', {
            title: 'Minha Evolução',
            user: req.user
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar evolução.' });
    }
});

// 4. IA COACH
router.get('/ai-coach', async (req, res) => {
    try {
        res.render('pages/client-ai-coach', {
            title: 'Coach Inteligente',
            user: req.user
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar IA Coach.' });
    }
});

// 5. FINANCEIRO / PLANOS
router.get('/financial', async (req, res) => {
    try {
        res.render('pages/client-financial', {
            title: 'Minha Assinatura',
            user: req.user
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar financeiro.' });
    }
});

// 6. PERFIL
router.get('/profile', async (req, res) => {
    try {
        res.render('pages/client-profile', {
            title: 'Meu Perfil',
            user: req.user
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar perfil.' });
    }
});

// 7. CONFIGURAÇÕES
router.get('/settings', async (req, res) => {
    try {
        res.render('pages/client-settings', {
            title: 'Configurações',
            user: req.user
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro ao carregar configurações.' });
    }
});

module.exports = router;
