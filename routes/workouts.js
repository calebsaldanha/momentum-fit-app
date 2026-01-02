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

// =========================================================================
// Rota do Treinador (Create, Edit, Delete)
// IMPORTANTE: Definir estas rotas ANTES da rota genérica /:id
// =========================================================================
const trainerRouter = express.Router();
trainerRouter.use(requireTrainerAuth);

// 1. Criar Treino (GET)
trainerRouter.get('/create', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        let query; let params = [];
        
        if (userRole === 'superadmin') {
            query = "SELECT id, name FROM users WHERE role = 'client' AND status = 'active' ORDER BY name";
        } else {
            query = `SELECT u.id, u.name FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE cp.assigned_trainer_id = $1 AND u.status = 'active' ORDER BY u.name`;
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
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' }); 
    }
});

// 2. Criar Treino (POST)
trainerRouter.post('/create', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    if (!client_id || !title || !exercises) return res.status(400).json({ success: false, message: 'Dados inválidos' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const wRes = await client.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id", 
            [client_id, req.session.user.id, title, description||'']
        );
        const wid = wRes.rows[0].id;
        
        for (let i=0; i<exercises.length; i++) {
            const ex = exercises[i];
            await client.query(
                "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url, library_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", 
                [wid, ex.name, ex.sets, ex.reps, ex.description||'', i, ex.video_url||null, ex.image_url||null, ex.library_id||null]
            );
        }
        await client.query('COMMIT');
        
        // Notificar (busca nome do treinador para a notificação)
        const tRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.session.user.id]);
        const trainerName = tRes.rows[0] ? tRes.rows[0].name : 'Seu Treinador';
        await notificationService.notifyNewWorkout(title, client_id, wid, trainerName);
        
        res.json({ success: true, clientId: client_id });
    } catch (e) { 
        console.error(e);
        await client.query('ROLLBACK'); 
        res.status(500).json({ success: false, message: 'Erro ao salvar treino.' }); 
    } finally { client.release(); }
});

// 3. Excluir Treino (POST)
trainerRouter.post('/delete/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        // Verifica dono do treino para redirecionar corretamente
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [workoutId]);
        if (w.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado' });
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
            await client.query("DELETE FROM workouts WHERE id = $1", [workoutId]);
            await client.query('COMMIT');
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        res.redirect('/admin/clients/' + w.rows[0].client_id);
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); 
    }
});

// 4. Editar Treino (GET)
trainerRouter.get('/edit/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        const wRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (wRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado.' });
        
        const exRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [workoutId]);
        
        res.render('pages/edit-workout', {
            title: 'Editar Treino',
            workout: wRes.rows[0],
            exercises: exRes.rows,
            csrfToken: res.locals.csrfToken,
            user: req.session.user,
            currentPage: 'create-workout'
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' }); 
    }
});

// 5. Editar Treino (POST)
trainerRouter.post('/edit/:id', async (req, res) => {
    const workoutId = req.params.id;
    const { title, description, exercises } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Atualiza cabeçalho
        await client.query("UPDATE workouts SET title = $1, description = $2 WHERE id = $3", [title, description, workoutId]);
        
        // Reescreve exercícios (método simples: apaga todos e recria)
        await client.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
        
        if (exercises && exercises.length > 0) {
            for (let i=0; i<exercises.length; i++) {
                const ex = exercises[i];
                await client.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url, library_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", 
                    [workoutId, ex.name, ex.sets, ex.reps, ex.description||'', i, ex.video_url||null, ex.image_url||null, ex.library_id||null]
                );
            }
        }
        
        await client.query('COMMIT');
        
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [workoutId]);
        res.json({ success: true, clientId: w.rows[0].client_id });
        
    } catch(e) {
        console.error(e);
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: e.message });
    } finally {
        client.release();
    }
});

router.use('/', trainerRouter); // Aplica as rotas de trainer primeiro

// =========================================================================
// Rota Pública/Visualização (Aluno e Personal)
// IMPORTANTE: Esta rota deve ficar por ÚLTIMO pois captura qualquer string como ID
// =========================================================================
router.get('/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const workoutId = req.params.id;
        const userId = req.session.user.id;

        // Marca notificação como lida
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND link = $2",
            [userId, `/workouts/${workoutId}`]
        );

        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        
        const exercisesRes = await pool.query(`
            SELECT we.*, 
                   COALESCE(el.description, we.notes) as final_description,
                   el.recommendations, el.execution_instructions, el.tips, el.image_url as lib_image
            FROM workout_exercises we 
            LEFT JOIN exercise_library el ON we.library_id = el.id
            WHERE we.workout_id = $1 ORDER BY we.order_index
        `, [workoutId]);
        
        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            user: req.session.user,
            currentPage: 'workouts'
        });
    } catch(e) { 
        // Se cair aqui, provavelmente o ID não é um UUID ou int válido
        console.error(e);
        res.status(404).render('pages/error', { message: 'Treino não encontrado.' }); 
    }
});

module.exports = router;
