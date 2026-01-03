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

// Detalhes do Aluno (Rota unificada)
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;
        const source = req.query.source; // Recebe a origem do clique

        const client = await db.getUserById(clientId);
        
        if (!client) {
            return res.status(404).render('pages/error', { message: 'Aluno não encontrado.', user: req.session.user });
        }
        
        // Regras de Visualização e Contexto
        let pageContext = 'clients'; // Padrão: Painel de Personal
        let showAdminOptions = false;

        // Se for Superadmin E estiver vindo explicitamente da gestão de usuários
        if (req.session.user.role === 'superadmin' && source === 'admin_manage') {
            pageContext = 'superadmin_users';
            showAdminOptions = true;
        } else {
            // Contexto de Personal: verifica se é o treinador do aluno ou se é superadmin (mas sem poderes de gestão nessa tela)
            if (client.trainer_id !== trainerId && req.session.user.role !== 'superadmin') {
                return res.status(403).render('pages/error', { message: 'Sem permissão.', user: req.session.user });
            }
        }

        const workouts = await db.getWorkoutsByUserId(clientId);
        const stats = await db.getUserStats(clientId); 
        
        // Busca perfil detalhado (Anamnese)
        const profileRes = await db.query("SELECT * FROM client_profiles WHERE user_id = $1", [clientId]);
        const detailedProfile = profileRes.rows[0] || {};

        let trainersList = [];
        if (showAdminOptions) { 
            trainersList = await db.getAllTrainers(); 
        }

        res.render('pages/client-details', {
            title: 'Detalhes do Aluno',
            bodyClass: 'dashboard-body',
            currentPage: pageContext,
            user: req.session.user,
            clientData: client, // Alterado para clientData para evitar conflito com EJS
            workouts: workouts || [],
            stats: stats || {},
            detailedProfile: detailedProfile,
            trainers: trainersList,
            showAdminOptions: showAdminOptions // Controla exibição do bloco admin
        });
    } catch (err) {
        console.error('Erro client details:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.', user: req.session.user });
    }
});

module.exports = router;
