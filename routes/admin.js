const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware Admin
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
            bodyClass: 'dashboard-body',
            currentPage: 'dashboard',
            user: req.session.user,
            stats: stats,
            recentClients: recentClients
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
            bodyClass: 'dashboard-body',
            currentPage: 'clients',
            user: req.session.user,
            clients: clients
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao listar alunos.', user: req.session.user });
    }
});

// Detalhes do Aluno (CORRIGIDO)
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;

        const client = await db.getUserById(clientId);
        
        if (!client) {
            return res.status(404).render('pages/error', { message: 'Aluno não encontrado.', user: req.session.user });
        }
        
        if (client.trainer_id !== trainerId && req.session.user.role !== 'superadmin') {
             return res.status(403).render('pages/error', { message: 'Sem permissão.', user: req.session.user });
        }

        const workouts = await db.getWorkoutsByUserId(clientId);
        const stats = await db.getUserStats(clientId); 
        const profileRes = await db.query("SELECT * FROM client_profiles WHERE user_id = $1", [clientId]);
        const detailedProfile = profileRes.rows[0] || {};

        const isSuperAdmin = req.session.user.role === "superadmin";
        const pageContext = isSuperAdmin ? "superadmin_users" : "clients";
        let trainersList = [];
        if (isSuperAdmin) { trainersList = await db.getAllTrainers(); }

        res.render("pages/client-details", {
            title: "Detalhes do Aluno",
            bodyClass: "dashboard-body",
            currentPage: pageContext,
            user: req.session.user,
            client: client,
            clientProfile: client,
            workouts: workouts || [],
            stats: stats || {},
            detailedProfile: detailedProfile || {},
            trainers: trainersList
        });
    } catch (err) {
        console.error('Erro client details:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.', user: req.session.user });
    }
});

router.get('/trainers', requireAdmin, async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.redirect('/admin/dashboard');
    try {
        const trainers = await db.getAllTrainers();
        res.render('pages/admin-trainers', { 
            title: 'Treinadores',
            bodyClass: 'dashboard-body',
            currentPage: 'trainers',
            user: req.session.user,
            trainers: trainers
        });
    } catch(err) {
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
