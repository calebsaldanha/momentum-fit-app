const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(checkRole('trainer'));

// DASHBOARD
router.get('/dashboard', (req, res) => {
    const stats = {
        active_clients: 5,
        total_workouts: 24,
        revenue: '1.250,00'
    };
    
    const recentActivity = [
        { user_name: 'João Silva', action: 'Completou Treino A', time: '10:30' },
        { user_name: 'Maria Souza', action: 'Renovou Plano', time: '09:15' }
    ];

    res.render('pages/trainer-dashboard', {
        user: req.user,
        stats,
        recentActivity,
        path: '/trainer/dashboard'
    });
});

// ALUNOS
router.get('/clients', (req, res) => {
    const clients = [
        { id: 1, name: 'João Silva', email: 'joao@email.com', plan: 'Consultoria', status: 'Ativo' },
        { id: 2, name: 'Maria Souza', email: 'maria@email.com', plan: 'Personal VIP', status: 'Ativo' }
    ];

    res.render('pages/trainer-clients', {
        user: req.user,
        clients,
        path: '/trainer/clients'
    });
});

// BIBLIOTECA
router.get('/workouts', (req, res) => {
    res.render('pages/trainer-library', {
        user: req.user,
        path: '/trainer/workouts'
    });
});

module.exports = router;
