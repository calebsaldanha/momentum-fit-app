const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Middleware geral
router.use(ensureAuthenticated);
router.use(ensureRole('trainer'));

// --- DASHBOARD ---
router.get('/dashboard', async (req, res) => {
    try {
        const trainerUserId = req.session.user.id;

        // 1. Total de Alunos Ativos
        const clientsQuery = `
            SELECT COUNT(*) as count 
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE u.trainer_id = $1 AND s.status = 'active'
        `;
        const clientsRes = await db.query(clientsQuery, [trainerUserId]);
        const activeClients = clientsRes.rows[0].count;

        // 2. Treinos Criados (Total)
        const workoutsQuery = `
            SELECT COUNT(*) as count FROM workouts WHERE trainer_id = $1
        `;
        const workoutsRes = await db.query(workoutsQuery, [trainerUserId]);
        const totalWorkouts = workoutsRes.rows[0].count;

        // 3. Últimos Check-ins dos Alunos (Feed de Atividade)
        const checkinsQuery = `
            SELECT c.date, c.effort_level, u.name as client_name, w.title as workout_title
            FROM checkins c
            JOIN users u ON c.user_id = u.id
            JOIN workouts w ON c.workout_id = w.id
            WHERE u.trainer_id = $1
            ORDER BY c.created_at DESC
            LIMIT 5
        `;
        const checkinsRes = await db.query(checkinsQuery, [trainerUserId]);

        // 4. Receita Estimada (Exemplo simples: R$ 50 por aluno ativo - ajuste conforme regra de negócio)
        // Em um sistema real, viria da tabela 'transactions'
        const estimatedRevenue = activeClients * 50; 

        res.render('pages/trainer-dashboard', {
            user: req.session.user,
            activeClients,
            totalWorkouts,
            recentCheckins: checkinsRes.rows,
            estimatedRevenue
        });

    } catch (err) {
        console.error('Erro Dashboard Trainer:', err);
        res.render('pages/trainer-dashboard', {
            user: req.session.user,
            activeClients: 0,
            totalWorkouts: 0,
            recentCheckins: [],
            estimatedRevenue: 0
        });
    }
});

// --- MEUS ALUNOS ---
router.get('/clients', async (req, res) => {
    try {
        const trainerId = req.session.user.id;
        // Busca alunos vinculados
        const query = `
            SELECT u.id, u.name, u.email, u.profile_image, 
                   c.fitness_goals, s.status as sub_status
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            LEFT JOIN subscriptions s ON u.id = s.user_id
            WHERE u.trainer_id = $1
        `;
        const result = await db.query(query, [trainerId]);
        
        res.render('pages/trainer-clients', { clients: result.rows });
    } catch (err) {
        console.error(err);
        res.redirect('/trainer/dashboard');
    }
});

// --- BIBLIOTECA (Placeholder) ---
router.get('/library', (req, res) => {
    res.render('pages/trainer-library');
});

// --- CONTEÚDO (Placeholder) ---
router.get('/content', (req, res) => {
    res.render('pages/trainer-content');
});

// --- FINANCEIRO (Placeholder) ---
router.get('/financial', (req, res) => {
    res.render('pages/trainer-financial');
});

// --- CONFIGURAÇÕES ---
router.get('/settings', (req, res) => {
    res.render('pages/trainer-settings');
});

module.exports = router;
