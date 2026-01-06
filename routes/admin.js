const express = require('express');
const router = express.Router();
const db = require('../database/db'); 

// Desestrutura para facilitar uso e manter consistência
const { 
    getUserById, 
    getTrainerStats, 
    getRecentClientsByTrainer, 
    getClientsByTrainer, 
    getWorkoutsByUserId, 
    getUserStats, 
    getAllTrainers,
    query 
} = db;

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
        const stats = await getTrainerStats(trainerId);
        const recentClients = await getRecentClientsByTrainer(trainerId);

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
        const clients = await getClientsByTrainer(trainerId);

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

// Detalhes do Aluno
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;
        const source = req.query.source;

        // Verifica se ID é válido
        if (!clientId) {
             return res.status(404).render('pages/error', { message: 'ID do aluno inválido.', user: req.session.user });
        }

        const client = await getUserById(clientId);
        
        if (!client) {
            return res.status(404).render('pages/error', { message: 'Aluno não encontrado.', user: req.session.user });
        }
        
        // Permissões
        let showAdminOptions = false;
        let pageContext = 'clients';

        if (req.session.user.role === 'superadmin' && source === 'admin_manage') {
            pageContext = 'superadmin_users';
            showAdminOptions = true;
        } else {
            // Uso de != (não estrito) para permitir comparação entre string e int
            if (client.trainer_id != trainerId && req.session.user.role !== 'superadmin') {
                 return res.status(403).render('pages/error', { message: 'Sem permissão para visualizar este aluno.', user: req.session.user });
            }
        }

        const workouts = await getWorkoutsByUserId(clientId);
        const stats = await getUserStats(clientId); 
        
        // Anamnese - Try/Catch específico para evitar quebra se a tabela não existir
        let detailedProfile = {};
        try {
            const profileRes = await query("SELECT * FROM client_profiles WHERE user_id = $1", [clientId]);
            detailedProfile = profileRes.rows[0] || {};
        } catch (e) {
            console.warn("Aviso: Tabela client_profiles pode não existir ou erro na query.", e.message);
        }

        let trainersList = [];
        if (showAdminOptions) { 
            trainersList = await getAllTrainers(); 
        }

        res.render('pages/client-details', {
            title: 'Detalhes do Aluno',
            bodyClass: 'dashboard-body',
            currentPage: pageContext,
            user: req.session.user,
            clientData: client,
            workouts: workouts || [],
            stats: stats || {},
            detailedProfile: detailedProfile,
            trainers: trainersList,
            showAdminOptions: showAdminOptions
        });
    } catch (err) {
        console.error('Erro client details:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes do aluno.', user: req.session.user });
    }
});

// Lista de Treinadores (Superadmin)
router.get('/trainers', requireAdmin, async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.redirect('/admin/dashboard');
    try {
        const trainers = await getAllTrainers();
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
