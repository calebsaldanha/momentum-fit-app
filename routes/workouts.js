const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) return next();
    res.redirect('/auth/login');
};

router.use(requireTrainerAuth);

// Página de Criação
router.get('/create', async (req, res) => {
    try {
        const clientId = req.query.client_id;
        let clients;
        
        if (req.session.user.role === 'superadmin') {
            // Superadmin vê todos os clientes
            clients = await pool.query("SELECT id, name FROM users WHERE role = 'client' AND status = 'active' ORDER BY name");
        } else {
            // Treinador vê seus clientes
            clients = await pool.query(`
                SELECT u.id, u.name 
                FROM users u 
                JOIN client_profiles cp ON u.id = cp.user_id 
                WHERE cp.assigned_trainer_id = $1 AND u.status = 'active' 
                ORDER BY u.name`, 
                [req.session.user.id]
            );
        }

        res.render('pages/create-workout', { 
            title: 'Criar Treino', 
            clients: clients.rows, 
            selectedClient: clientId, 
            csrfToken: res.locals.csrfToken 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro ao carregar formulário.' }); }
});

// Processar Criação
router.post('/create', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    try {
        // Criar Treino
        const workoutRes = await pool.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description) VALUES ($1, $2, $3, $4) RETURNING id",
            [client_id, req.session.user.id, title, description]
        );
        const workoutId = workoutRes.rows[0].id;

        // Inserir Exercícios
        if (exercises && Array.isArray(exercises)) {
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                await pool.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [workoutId, ex.name, ex.sets, ex.reps, ex.notes, i, ex.video_url]
                );
            }
        }

        // NOTIFICAR CLIENTE
        await notificationService.notifyNewWorkout(title, client_id, workoutId);

        res.redirect(`/admin/clients/${client_id}`);
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao salvar treino.' });
    }
});

// Visualizar Treino (Detalhes)
router.get('/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado' });
        
        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);
        
        res.render('pages/workout-details', { 
            title: workoutRes.rows[0].title, 
            workout: workoutRes.rows[0], 
            exercises: exercisesRes.rows 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro ao ver treino.' }); }
});

// Editar Treino (GET)
router.get('/edit/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado' });
        
        // Verifica permissão (apenas dono ou superadmin)
        if (req.session.user.role !== 'superadmin' && workoutRes.rows[0].trainer_id !== req.session.user.id) {
            return res.status(403).render('pages/error', { message: 'Sem permissão.' });
        }

        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);

        res.render('pages/edit-workout', {
            title: 'Editar Treino',
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            csrfToken: res.locals.csrfToken
        });
    } catch (err) { res.render('pages/error', { message: 'Erro ao carregar edição.' }); }
});

// Editar Treino (POST)
router.post('/edit/:id', async (req, res) => {
    const { title, description, exercises } = req.body;
    const workoutId = req.params.id;
    
    try {
        // Atualiza treino básico
        await pool.query("UPDATE workouts SET title = $1, description = $2 WHERE id = $3", [title, description, workoutId]);
        
        // Remove exercícios antigos e recria (abordagem simples)
        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);

        if (exercises && Array.isArray(exercises)) {
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                await pool.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [workoutId, ex.name, ex.sets, ex.reps, ex.notes, i, ex.video_url]
                );
            }
        }
        
        // Redireciona de volta para detalhes do cliente
        const wRes = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [workoutId]);
        res.redirect(`/admin/clients/${wRes.rows[0].client_id}`);
    } catch(e) { res.render('pages/error', { message: 'Erro ao editar.' }); }
});

module.exports = router;
