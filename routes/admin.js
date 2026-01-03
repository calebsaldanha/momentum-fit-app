const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de Autenticação Admin
const requireAdmin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    if (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin') return next();
    return res.status(403).render('pages/error', { message: 'Acesso negado.', user: req.session.user });
};

// Dashboard
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
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro no dashboard.', user: req.session.user });
    }
});

// Meus Alunos
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
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar alunos.', user: req.session.user });
    }
});

// Detalhes do Aluno (A rota com problema)
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;

        const client = await db.getUserById(clientId);
        
        // Verificação de segurança
        if (!client) {
            return res.status(404).render('pages/error', { message: 'Aluno não encontrado.', user: req.session.user });
        }
        
        // Verifica permissão (apenas treinador dono ou superadmin)
        if (client.trainer_id !== trainerId && req.session.user.role !== 'superadmin') {
             return res.status(403).render('pages/error', { message: 'Sem permissão para ver este aluno.', user: req.session.user });
        }

        const workouts = await db.getWorkoutsByUserId(clientId);
        const stats = await db.getUserStats(clientId); 

        // Renderização com objeto limpo
        res.render('pages/client-details', {
            title: 'Detalhes do Aluno',
            user: req.session.user,
            client: client,
            workouts: workouts || [],
            stats: stats || {},
            currentPage: 'clients',
            bodyClass: 'dashboard-body'
        });
    } catch (err) {
        console.error('Erro rota client-details:', err);
        res.status(500).render('pages/error', { message: 'Erro interno ao carregar aluno.', user: req.session.user });
    }
});

router.get('/trainers', requireAdmin, async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.redirect('/admin/dashboard');
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
