const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado. Apenas treinadores.' });
};

router.use(requireTrainerAuth);

// Página de Criação
router.get('/create', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        let query;
        let params = [];

        if (userRole === 'superadmin') {
            query = "SELECT id, name FROM users WHERE role = 'client' AND status = 'active' ORDER BY name";
        } else {
            query = `
                SELECT u.id, u.name 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.user_id 
                WHERE cp.assigned_trainer_id = $1 AND u.status = 'active' 
                ORDER BY u.name`;
            params = [userId];
        }

        const clients = await pool.query(query, params);

        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            clients: clients.rows, 
            selectedClientId: req.query.client_id || '', 
            csrfToken: res.locals.csrfToken,
            user: req.session.user,
            currentPage: 'create-workout'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário de treino.' });
    }
});

// Processar Criação
router.post('/create', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    
    if (!client_id || !title || !exercises || exercises.length === 0) {
        return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Criar o Treino
        const workoutRes = await client.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id",
            [client_id, req.session.user.id, title, description || '']
        );
        const workoutId = workoutRes.rows[0].id;

        // 2. Inserir Exercícios
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            await client.query(
                "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [workoutId, ex.name, ex.sets, ex.reps, ex.description || '', i, ex.video_url || null]
            );
        }

        await client.query('COMMIT');
        
        // Notificação Corrigida
        await notificationService.notifyNewWorkout(title, client_id, workoutId, req.session.user.name);

        res.json({ success: true, clientId: client_id });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao criar treino:", err);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar treino.' });
    } finally {
        client.release();
    }
});

// Editar Treino
router.get('/edit/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        
        if (req.session.user.role !== 'superadmin' && workoutRes.rows[0].trainer_id !== req.session.user.id) {
            return res.status(403).render('pages/error', { message: 'Você não pode editar este treino.' });
        }

        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);

        res.render('pages/edit-workout', {
            title: 'Editar Treino',
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            csrfToken: res.locals.csrfToken,
            user: req.session.user,
            currentPage: 'create-workout'
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' }); }
});

// Processar Edição
router.post('/edit/:id', async (req, res) => {
    const { title, description, exercises } = req.body;
    const workoutId = req.params.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query("UPDATE workouts SET title = $1, description = $2, updated_at = NOW() WHERE id = $3", [title, description, workoutId]);
        await client.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
        
        if (exercises && exercises.length > 0) {
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                await client.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [workoutId, ex.name, ex.sets, ex.reps, ex.description || '', i, ex.video_url || null]
                );
            }
        }
        await client.query('COMMIT');
        
        const wRes = await client.query("SELECT client_id FROM workouts WHERE id = $1", [workoutId]);
        
        // Notificação de Edição
        await notificationService.notifyWorkoutUpdate(title, wRes.rows[0].client_id, req.session.user.name);
        
        res.json({ success: true, clientId: wRes.rows[0].client_id });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: 'Erro ao atualizar.' });
    } finally {
        client.release();
    }
});

// Detalhes do Treino (View)
router.get('/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado.' });
        
        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);
        
        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            user: req.session.user,
            currentPage: 'create-workout'
        });
    } catch(e) { res.render('pages/error', { message: 'Erro detalhes.' }); }
});

router.post('/delete/:id', async (req, res) => {
    try {
        const workout = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [req.params.id]);
        if (workout.rows.length > 0) {
            await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
            await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
            res.redirect('/admin/clients/' + workout.rows[0].client_id);
        } else {
            res.redirect('/admin/dashboard');
        }
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao excluir.' });
    }
});

module.exports = router;
