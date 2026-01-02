const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireTrainer = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso Negado' });
};

// 1. Criar Treino (GET)
router.get('/create', requireTrainer, async (req, res) => {
    try {
        // CORREÇÃO: Busca lista de alunos para o dropdown
        const clients = await pool.query("SELECT id, name FROM users WHERE role = 'client' ORDER BY name ASC");
        
        res.render('pages/create-workout', {
            title: 'Novo Treino',
            clients: clients.rows, // View precisa desta lista
            selectedClientId: req.query.client_id || '',
            currentPage: 'workouts'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' });
    }
});

// 2. Criar Treino (POST)
router.post('/create', requireTrainer, async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    try {
        const workoutResult = await pool.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id",
            [client_id, req.session.user.id, title, description]
        );
        const workoutId = workoutResult.rows[0].id;

        if (exercises && exercises.length > 0) {
            for (const ex of exercises) {
                await pool.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, video_url, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [workoutId, ex.name, ex.sets, ex.reps, ex.notes, ex.video_url, ex.order_index]
                );
            }
        }

        // Notifica o aluno
        await notificationService.notifyNewWorkout(client_id, title);

        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao salvar treino.' });
    }
});

// 3. Detalhes do Treino (GET)
router.get('/:id', async (req, res) => { // Acesso público para o aluno ver
    try {
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado' });

        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [req.params.id]);

        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            currentPage: 'workouts'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar treino.' });
    }
});

// 4. Excluir Treino (POST)
router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        // Pega o ID do cliente antes de deletar para redirecionar
        const workoutRes = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [req.params.id]);
        const clientId = workoutRes.rows[0]?.client_id;

        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        
        if (clientId) res.redirect(`/admin/clients/${clientId}`);
        else res.redirect('/admin/clients');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao excluir treino.' });
    }
});

module.exports = router;
