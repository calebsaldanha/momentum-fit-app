const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('trainer'));

// --- DASHBOARD ---
router.get('/dashboard', (req, res) => {
    const stats = {
        active_clients: 5,
        total_workouts: 24,
        revenue: '1.250,00'
    };
    const recentActivity = [
        { user_name: 'João Silva', action: 'Check-in realizado', time: '10:30' }
    ];

    res.render('pages/trainer-dashboard', {
        user: req.user,
        stats,
        recentActivity,
        path: '/trainer/dashboard'
    });
});

// --- CLIENTS MANAGEMENT ---
router.get('/clients', (req, res) => {
    const clients = [
        { id: 1, name: 'João Silva', email: 'joao@email.com', plan: 'Consultoria', status: 'Ativo' },
        { id: 2, name: 'Maria Souza', email: 'maria@email.com', plan: 'Personal VIP', status: 'Ativo' }
    ];
    res.render('pages/trainer-clients', { user: req.user, clients, path: '/trainer/clients' });
});

router.get('/clients/invite', (req, res) => {
    res.render('pages/initial-form', { // Reusando form ou criar view específica
        user: req.user,
        path: '/trainer/clients' 
    }); 
});

router.get('/clients/:id', (req, res) => {
    // Detalhe do aluno + Anamnese (Read Only para o Trainer)
    const client = { 
        id: req.params.id, 
        name: 'João Silva', 
        email: 'joao@email.com', 
        anamnesis: {
            objective: 'Emagrecimento',
            injuries: 'Joelho direito',
            experience: 'Intermediário'
        }
    };
    res.render('pages/trainer-details', { user: req.user, client, path: '/trainer/clients' });
});

// --- WORKOUTS LIBRARY (Fix Internal Server Error) ---
router.get('/workouts', (req, res) => {
    try {
        const workouts = [
            { id: 1, name: 'Full Body A', created_at: '2024-01-20' },
            { id: 2, name: 'Full Body B', created_at: '2024-01-22' }
        ];
        res.render('pages/trainer-library', { 
            user: req.user, 
            workouts, // Variável que faltava e causava erro
            path: '/trainer/workouts' 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro na biblioteca', user: req.user, path: '' });
    }
});

router.get('/workouts/create', (req, res) => {
    res.render('pages/create-workout', { user: req.user, path: '/trainer/workouts' });
});

// Rota para criar programa específico para um aluno
router.get('/program/:clientId', (req, res) => {
    res.render('pages/create-workout', { 
        user: req.user, 
        path: '/trainer/clients',
        targetClient: req.params.clientId 
    });
});

// --- FINANCIAL ---
router.get('/financial', (req, res) => {
    const transactions = [
        { id: 101, client: 'Maria Souza', amount: 250.00, date: '25/01/2026', status: 'Pago' }
    ];
    res.render('pages/trainer-financial', { user: req.user, transactions, path: '/trainer/financial' });
});

// --- CONTENT ---
router.get('/content/create', (req, res) => {
    res.render('pages/create-article', { user: req.user, path: '/trainer/content' });
});

module.exports = router;
