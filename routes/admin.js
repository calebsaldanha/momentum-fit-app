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
        const trainerId = req.session.user.id; // PEGA O ID DE QUEM ESTÁ LOGADO
        
        // Busca estatísticas e alunos APENAS deste ID
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
        const trainerId = req.session.user.id; // FILTRO CRÍTICO
        
        // Busca APENAS alunos deste treinador
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

// --- ROTA: DETALHES DO ALUNO (Visualização pelo Treinador) ---
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;

        // Verifica se o aluno existe E se pertence a este treinador
        // (Ou se é superadmin, talvez queira ver, mas pela regra de negócio "Painel Treinador", segue o filtro)
        const client = await db.getUserById(clientId);
        
        // Segurança: Se o aluno não for seu, redireciona (exceto se for superadmin querendo forçar, mas manteremos a regra do painel)
        if (!client || (client.trainer_id !== trainerId && req.session.user.role !== 'superadmin')) {
             return res.status(403).render('pages/error', { message: 'Este aluno não está vinculado a você.', user: req.session.user });
        }

        const workouts = await db.getWorkoutsByUserId(clientId);
        const stats = await db.getUserStats(clientId); // Requer implementação genérica ou específica

        res.render('pages/client-details', {
            title: \`Aluno: \${client.name}\`,
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

// --- ROTA: LISTA DE TREINADORES (Apenas Visual, se necessário no menu do Admin) ---
// Geralmente o Personal não vê lista de outros personais, mas se existir:
router.get('/trainers', requireAdmin, async (req, res) => {
    // Se for Superadmin acessando via menu de admin, ok. Se for personal comum, talvez não deva ver.
    if(req.session.user.role !== 'superadmin') {
        return res.redirect('/admin/dashboard');
    }
    try {
        const trainers = await db.getAllTrainers();
        res.render('pages/admin-trainers', { // Você precisaria ter essa view ou reusar uma
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
