const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

// Rota de Visualização (Aluno/Personal)
router.get('/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const workoutId = req.params.id;
        const userId = req.session.user.id;

        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id =  AND link = ",
            [userId, `/workouts/${workoutId}`]
        );

        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = ", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado.' });
        
        // JOIN inteligente: pega dados da tabela library se library_id existir
        const exercisesRes = await pool.query(`
            SELECT we.*, 
                   COALESCE(el.description, we.notes) as final_description,
                   el.recommendations, el.execution_instructions, el.tips, el.image_url as lib_image
            FROM workout_exercises we 
            LEFT JOIN exercise_library el ON we.library_id = el.id
            WHERE we.workout_id =  ORDER BY we.order_index
        `, [workoutId]);
        
        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            user: req.session.user,
            currentPage: 'workouts'
        });
    } catch(e) { 
        console.error(e);
        res.render('pages/error', { message: 'Erro detalhes.' }); 
    }
});

const trainerRouter = express.Router();
trainerRouter.use(requireTrainerAuth);

trainerRouter.get('/create', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        let query; let params = [];
        if (userRole === 'superadmin') {
            query = "SELECT id, name FROM users WHERE role = 'client' AND status = 'active' ORDER BY name";
        } else {
            query = `SELECT u.id, u.name FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE cp.assigned_trainer_id =  AND u.status = 'active' ORDER BY u.name`;
            params = [userId];
        }
        const clients = await pool.query(query, params);
        res.render('pages/create-workout', { title: 'Novo Treino', clients: clients.rows, selectedClientId: req.query.client_id || '', csrfToken: res.locals.csrfToken, user: req.session.user, currentPage: 'create-workout' });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro.' }); }
});

trainerRouter.post('/create', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    if (!client_id || !title || !exercises) return res.status(400).json({ success: false, message: 'Dados inválidos' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const wRes = await client.query("INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES (, , , , NOW()) RETURNING id", [client_id, req.session.user.id, title, description||'']);
        const wid = wRes.rows[0].id;
        
        for (let i=0; i<exercises.length; i++) {
            const ex = exercises[i];
            // Salva o library_id e a imagem se vierem do front
            await client.query(
                "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url, library_id) VALUES (, , , , , , , , )", 
                [wid, ex.name, ex.sets, ex.reps, ex.description||'', i, ex.video_url||null, ex.image_url||null, ex.library_id||null]
            );
        }
        await client.query('COMMIT');
        await notificationService.notifyNewWorkout(title, client_id, wid, req.session.user.name);
        res.json({ success: true, clientId: client_id });
    } catch (e) { 
        console.error(e);
        await client.query('ROLLBACK'); 
        res.status(500).json({ success: false }); 
    } finally { client.release(); }
});

router.use('/', trainerRouter); // Aplica as rotas de trainer primeiro
module.exports = router;
