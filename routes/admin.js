const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware
const requireAdmin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    if (['trainer', 'admin', 'superadmin'].includes(req.session.user.role)) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado.', user: req.session.user });
};

router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const stats = await db.getTrainerStats(req.session.user.id);
        const recentClients = await db.getRecentClientsByTrainer(req.session.user.id);
        res.render('pages/admin-dashboard', {
            title: 'Painel', user: req.session.user, stats: stats || {}, recentClients: recentClients || [], currentPage: 'dashboard'
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro dashboard', user: req.session.user });
    }
});

router.get('/clients', requireAdmin, async (req, res) => {
    try {
        const clients = await db.getClientsByTrainer(req.session.user.id);
        res.render('pages/admin-clients', {
            title: 'Meus Alunos', user: req.session.user, clients, currentPage: 'clients'
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro lista', user: req.session.user });
    }
});

// Detalhes do Aluno
router.get('/clients/:id', requireAdmin, async (req, res) => {
    try {
        const clientId = req.params.id;
        
        // Busca perfil completo
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, u.created_at as joined_at,
                   c.*, c.id as client_real_id
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `;
        const clientRes = await db.query(clientQuery, [clientId]);
        const clientData = clientRes.rows[0];

        if (!clientData) return res.redirect('/admin/clients');

        // Busca treinos
        let workouts = [];
        if (clientData.client_real_id) {
            const wRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [clientData.client_real_id]);
            workouts = wRes.rows;
        }

        // Renderiza usando o template padronizado
        res.render('pages/client-details', { 
            title: 'Detalhes do Aluno', 
            user: req.session.user, 
            student: clientData,
            workouts: workouts,
            currentPage: 'clients'
        });

    } catch (err) {
        console.error(err);
        res.redirect('/admin/clients');
    }
});

router.get('/trainers', requireAdmin, async (req, res) => {
    if(req.session.user.role !== 'superadmin') return res.redirect('/admin/dashboard');
    const trainers = await db.getAllTrainers();
    res.render('pages/admin-trainers', { title: 'Treinadores', user: req.session.user, trainers, currentPage: 'trainers' });
});

module.exports = router;
