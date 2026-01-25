const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('trainer'));

// --- DASHBOARD ---
router.get('/dashboard', async (req, res) => {
    try {
        // Contar alunos
        const clientCountRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'client'"); // Idealmente filtrar por trainer_id se existir associação
        const activeClients = clientCountRes.rows[0].count;

        // Contar treinos criados
        const workoutCountRes = await db.query("SELECT COUNT(*) FROM workouts"); // Filtrar por criador se possível
        const totalWorkouts = workoutCountRes.rows[0].count;

        const stats = {
            active_clients: activeClients,
            total_workouts: totalWorkouts,
            revenue: '0,00'
        };

        res.render('pages/trainer-dashboard', {
            user: req.user,
            stats,
            recentActivity: [],
            path: '/trainer/dashboard'
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro DB Trainer', user: req.user, path: '' });
    }
});

// --- LISTA DE ALUNOS ---
router.get('/clients', async (req, res) => {
    try {
        // Busca todos os clientes (Num sistema real, buscaria WHERE trainer_id = X)
        const result = await db.query("SELECT id, name, email, plan FROM users WHERE role = 'client' ORDER BY created_at DESC");
        
        res.render('pages/trainer-clients', {
            user: req.user,
            clients: result.rows,
            path: '/trainer/clients'
        });
    } catch (err) {
        console.error(err);
        res.render('pages/trainer-clients', { user: req.user, clients: [], path: '/trainer/clients' });
    }
});

// --- BIBLIOTECA DE TREINOS ---
router.get('/workouts', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM workouts ORDER BY created_at DESC");
        res.render('pages/trainer-library', { 
            user: req.user, 
            workouts: result.rows, 
            path: '/trainer/workouts' 
        });
    } catch (err) {
        res.render('pages/trainer-library', { user: req.user, workouts: [], path: '/trainer/workouts' });
    }
});

router.get('/workouts/create', (req, res) => {
    res.render('pages/create-workout', { user: req.user, path: '/trainer/workouts' });
});

// POST criar treino
router.post('/workouts/create', async (req, res) => {
    try {
        const { name, description, difficulty, category } = req.body;
        // Inserir no banco
        await db.query(
            'INSERT INTO workouts (name, description, difficulty, category, created_by, is_public) VALUES ($1, $2, $3, $4, $5, $6)',
            [name, description, difficulty, category, req.user.id, true]
        );
        req.flash('success_msg', 'Treino criado com sucesso!');
        res.redirect('/trainer/workouts');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Erro ao criar treino.');
        res.redirect('/trainer/workouts/create');
    }
});

router.get('/financial', (req, res) => {
    res.render('pages/trainer-financial', { user: req.user, transactions: [], path: '/trainer/financial' });
});

router.get('/content', (req, res) => {
    res.render('pages/trainer-content', { user: req.user, path: '/trainer/content' });
});

router.get('/settings', (req, res) => {
    res.render('pages/trainer-settings', { user: req.user, path: '/trainer/settings' });
});

module.exports = router;
