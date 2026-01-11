const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de verificação de permissão
const requireAdmin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    // Permite 'trainer', 'admin' e 'superadmin'
    if (['trainer', 'admin', 'superadmin'].includes(req.session.user.role)) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado.', user: req.session.user });
};

// Dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        
        // RECUPERADO: Busca estatísticas e alunos recentes
        const stats = await db.getTrainerStats(trainerId);
        const recentClients = await db.getRecentClientsByTrainer(trainerId);

        res.render('pages/admin-dashboard', {
            title: 'Painel do Treinador',
            bodyClass: 'dashboard-body',
            currentPage: 'dashboard',
            user: req.session.user,
            stats: stats || { totalClients: 0, totalWorkouts: 0, weeklyCheckins: 0 },
            recentClients: recentClients || []
        });
    } catch (err) {
        console.error("Erro dashboard:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.', user: req.session.user });
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

// Detalhes do Aluno
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        const clientId = req.params.id;
        const source = req.query.source;

        // Busca dados do usuário (aluno)
        const client = await db.getUserById(clientId);
        
        if (!client) {
            return res.status(404).render('pages/error', { message: 'Aluno não encontrado.', user: req.session.user });
        }
        
        // Verificação de segurança: O aluno pertence a este treinador? (Exceto Superadmin)
        let showAdminOptions = false;
        let pageContext = 'clients';

        if (req.session.user.role === 'superadmin') {
            if (source === 'admin_manage') pageContext = 'superadmin_users';
            showAdminOptions = true;
        } else {
            // Se for treinador comum, só pode ver seus próprios alunos
            if (client.trainer_id != trainerId) {
                 return res.status(403).render('pages/error', { message: 'Você não tem permissão para ver este aluno.', user: req.session.user });
            }
        }

        // Busca dados complementares
        const workouts = await db.getWorkoutsByUserId(clientId);
        const stats = await db.getUserStats(clientId);
        
        // Tenta buscar o perfil detalhado (tabela clients)
        // Usamos uma query direta auxiliar ou reutilizamos a lógica do db.js se disponível
        // Aqui vamos usar uma query direta para garantir
        let detailedProfile = {};
        try {
            const profileRes = await db.query(`
                SELECT c.*, u.name, u.email, u.profile_image 
                FROM clients c 
                JOIN users u ON c.user_id = u.id 
                WHERE u.id = $1
            `, [clientId]);
            if (profileRes.rows.length > 0) {
                detailedProfile = profileRes.rows[0];
            } else {
                // Fallback: usa dados básicos de user se não tiver na tabela clients
                detailedProfile = client;
            }
        } catch (e) {
            console.warn("Erro ao buscar perfil detalhado:", e.message);
            detailedProfile = client;
        }

        let trainersList = [];
        if (showAdminOptions) { 
            trainersList = await db.getAllTrainers(); 
        }

        // Renderiza a view (usando trainer-details.ejs que criamos anteriormente ou client-details.ejs existente)
        // Como o arquivo client-details.ejs foi mencionado, vamos garantir que ele receba tudo.
        // Se você estiver usando trainer-details.ejs para essa view, altere abaixo.
        // Vou apontar para trainer-details pois é o mais completo que criamos.
        res.render('pages/trainer-details', {
            title: 'Detalhes do Aluno',
            bodyClass: 'dashboard-body',
            currentPage: pageContext,
            user: req.session.user,
            client: detailedProfile, // Passamos o perfil completo como 'client'
            workouts: workouts || [],
            stats: stats || {},
            trainers: trainersList,
            showAdminOptions: showAdminOptions
        });

    } catch (err) {
        console.error('Erro client details:', err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.', user: req.session.user });
    }
});

// Lista de Treinadores (Superadmin)
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
