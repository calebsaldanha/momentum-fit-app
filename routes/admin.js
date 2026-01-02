const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware para garantir que é Admin ou Superadmin
const requireAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    // Superadmin TAMBÉM pode acessar a área de admin (Modo Personal)
    if (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin') {
        return next();
    }
    return res.status(403).render('pages/error', { 
        message: 'Acesso negado. Apenas treinadores.',
        user: req.session.user 
    });
};

// --- ROTA: DASHBOARD DO TREINADOR ---
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id; 
        
        const stats = await db.getTrainerStats(trainerId);
        const recentClients = await db.getRecentClientsByTrainer(trainerId);

        res.render('pages/admin-dashboard', {
            title: 'Painel do Treinador',
            user: req.session.user,
            stats: stats,
            recentClients: recentClients,
            currentPage: 'dashboard',
            bodyClass: 'dashboard-body'
        });
    } catch (err) {
        console.error('Erro no dashboard admin:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard', user: req.session.user });
    }
});

// --- ROTA: MEUS ALUNOS ---
router.get('/clients', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clients = await db.getClientsByTrainer(trainerId);

        res.render('pages/admin-clients', {
            title: 'Meus Alunos',
            user: req.session.user,
            clients: clients,
            currentPage: 'clients',
            bodyClass: 'dashboard-body'
        });
    } catch (err) {
        console.error('Erro ao listar alunos:', err);
        res.status(500).render('pages/error', { message: 'Erro ao buscar alunos', user: req.session.user });
    }
});

// --- ROTA: DETALHES DO ALUNO ---
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;

        const client = await db.getUserById(clientId);
        
        if (!client || (client.trainer_id !== trainerId && req.session.user.role !== 'superadmin')) {
             return res.status(403).render('pages/error', { message: 'Este aluno não está vinculado a você.', user: req.session.user });
        }

        const workouts = await db.getWorkoutsByUserId(clientId);
        const stats = await db.getUserStats(clientId); 

        res.render('pages/client-details', {
            title: `Aluno: ${client.name}`,
            user: req.session.user,
            client: client,
            workouts: workouts,
            stats: stats || {},
            currentPage: 'clients',
            bodyClass: 'dashboard-body'
        });
    } catch (err) {
        console.error('Erro detalhes aluno:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes', user: req.session.user });
    }
});

router.get('/trainers', requireAdmin, async (req, res) => {
    if(req.session.user.role !== 'superadmin') {
        return res.redirect('/admin/dashboard');
    }
    try {
        const trainers = await db.getAllTrainers();
        res.render('pages/admin-trainers', { 
            title: 'Treinadores',
            user: req.session.user,
            trainers: trainers,
            currentPage: 'trainers',
            bodyClass: 'dashboard-body'
        });
    } catch(err) {
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
