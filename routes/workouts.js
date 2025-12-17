const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(requireTrainerAuth);

// Página de Criação
router.get('/create', async (req, res) => {
    try {
        const { role, id } = req.session.user;
        let clientsQuery;
        let params = [];
        if (role === 'superadmin') {
            clientsQuery = "SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name";
        } else {
            clientsQuery = "SELECT u.id, u.name, u.email FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.role = 'client' AND cp.assigned_trainer_id = $1 ORDER BY u.name";
            params = [id];
        }
        const clientsRes = await pool.query(clientsQuery, params);
        const selectedClientId = req.query.clientId || '';
        res.render('pages/create-workout', { title: 'Criar Treino - Momentum Fit', clients: clientsRes.rows, selectedClientId });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar a página.' });
    }
});

// Página de Edição (Sincronizada com o Layout de Criação)
router.get('/edit/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        const { role, id: trainerId } = req.session.user;

        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        const workout = workoutRes.rows[0];

        let clientsQuery;
        let params = [];
        if (role === 'superadmin') {
            clientsQuery = "SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name";
        } else {
            clientsQuery = "SELECT u.id, u.name, u.email FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.role = 'client' AND cp.assigned_trainer_id = $1 ORDER BY u.name";
            params = [trainerId];
        }
        const clientsRes = await pool.query(clientsQuery, params);

        res.render('pages/edit-workout', {
            title: 'Editar Treino - Momentum Fit',
            workout: workout,
            clients: clientsRes.rows,
            exercises: workout.exercises || [],
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// Processar Edição
router.post('/edit/:id', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    try {
        await pool.query(
            "UPDATE workouts SET client_id = $1, title = $2, description = $3, exercises = $4, updated_at = NOW() WHERE id = $5",
            [client_id, title, description, JSON.stringify(exercises), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT w.*, ut.name as trainer_name, uc.name as client_name FROM workouts w LEFT JOIN users ut ON w.trainer_id = ut.id LEFT JOIN users uc ON w.client_id = uc.id WHERE w.id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        res.render('pages/workout-details', { workout: workoutRes.rows[0] });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao ver treino.' });
    }
});

module.exports = router;
