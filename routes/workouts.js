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

// 1. Criar Treino (GET) - Agora busca a Biblioteca de Exercícios
router.get('/create', requireTrainer, async (req, res) => {
    try {
        const clients = await pool.query("SELECT id, name FROM users WHERE role = 'client' ORDER BY name ASC");
        
        // CORREÇÃO: Busca a biblioteca de exercícios para o modal de seleção
        const library = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/create-workout', {
            title: 'Novo Treino',
            clients: clients.rows,
            exerciseLibrary: library.rows, // Envia a library para a view
            selectedClientId: req.query.client_id || '',
            currentPage: 'workouts'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' });
    }
});

// 2. Criar Treino (POST) - Agora salva a image_url
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
                // CORREÇÃO: Salva image_url
                await pool.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, video_url, image_url, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                    [workoutId, ex.name, ex.sets, ex.reps, ex.notes, ex.video_url, ex.image_url, ex.order_index]
                );
            }
        }

        await notificationService.notifyNewWorkout(client_id, title);
        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao salvar treino.' });
    }
});

// 3. Detalhes (Sem alterações na lógica, apenas garante que image_url venha do banco)
router.get('/:id', async (req, res) => {
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

router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [req.params.id]);
        const clientId = workoutRes.rows[0]?.client_id;
        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        
        if (clientId) res.redirect(`/admin/clients/${clientId}`);
        else res.redirect('/admin/clients');
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); }
});

module.exports = router;
