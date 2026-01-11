const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de verificação de permissão
const requireAdmin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    if (['trainer', 'admin', 'superadmin'].includes(req.session.user.role)) {
        return next();
    }
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

        const clientUser = await db.getUserById(clientId);
        
        if (!clientUser) {
            return res.status(404).render('pages/error', { message: 'Aluno não encontrado.', user: req.session.user });
        }
        
        let showAdminOptions = false;
        let pageContext = 'clients';

        if (req.session.user.role === 'superadmin') {
            if (source === 'admin_manage') pageContext = 'superadmin_users';
            showAdminOptions = true;
        } else {
            if (clientUser.trainer_id != trainerId) {
                 return res.status(403).render('pages/error', { message: 'Você não tem permissão para ver este aluno.', user: req.session.user });
            }
        }

        const workouts = await db.getWorkoutsByUserId(clientId);
        
        // Busca perfil detalhado
        let detailedProfile = {};
        try {
            const profileRes = await db.query(`
                SELECT c.*, c.id as client_real_id, u.name, u.email, u.profile_image, u.created_at as joined_at
                FROM clients c 
                JOIN users u ON c.user_id = u.id 
                WHERE u.id = $1
            `, [clientId]);
            
            if (profileRes.rows.length > 0) {
                detailedProfile = profileRes.rows[0];
            } else {
                detailedProfile = clientUser; // Fallback
            }
        } catch (e) {
            detailedProfile = clientUser;
        }

        let trainersList = [];
        if (showAdminOptions) { 
            trainersList = await db.getAllTrainers(); 
        }

        // CORREÇÃO: Passando como 'student' em vez de 'client'
        res.render('pages/trainer-details', {
            title: 'Detalhes do Aluno',
            bodyClass: 'dashboard-body',
            currentPage: pageContext,
            user: req.session.user,
            student: detailedProfile, 
            workouts: workouts || [],
            trainers: trainersList,
            showAdminOptions: showAdminOptions
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
