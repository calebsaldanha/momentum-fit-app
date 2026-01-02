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
// =========================================================================
const trainerRouter = express.Router();
trainerRouter.use(requireTrainerAuth);

// 1. Tela de Criar (GET) - CORRIGIDO
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

        // --- CORREÇÃO IMPORTANTE: Busca a biblioteca de exercícios ---
        const library = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            clients: clients.rows, 
            exerciseLibrary: library.rows, // Envia para a View
            selectedClientId: req.query.client_id || '', 
            user: req.session.user, 
            currentPage: 'create-workout' 
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' }); 
    }
});

// 2. Ação de Criar (POST)
trainerRouter.post('/create', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    
    if (!client_id || !title || !exercises) {
        return res.status(400).json({ success: false, message: 'Dados inválidos. Preencha todos os campos.' });
    }
    
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
            // Salva image_url vinda do front
            await client.query(
                "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
                [wid, ex.name, ex.sets, ex.reps, ex.notes||'', ex.order_index, ex.video_url||null, ex.image_url||null]
            );
        }
        await client.query('COMMIT');
        
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

// 3. Excluir (POST)
trainerRouter.post('/delete/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [workoutId]);
        if (w.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado' });
        
        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
        await pool.query("DELETE FROM workouts WHERE id = $1", [workoutId]);

        res.redirect('/admin/clients/' + w.rows[0].client_id);
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); 
    }
});

// 4. Tela Editar (GET)
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
            user: req.session.user,
            currentPage: 'create-workout'
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' }); 
    }
});

// 5. Ação Editar (POST)
trainerRouter.post('/edit/:id', async (req, res) => {
    const workoutId = req.params.id;
    const { title, description, exercises } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("UPDATE workouts SET title = $1, description = $2 WHERE id = $3", [title, description, workoutId]);
        await client.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
        
        if (exercises && exercises.length > 0) {
            for (let i=0; i<exercises.length; i++) {
                const ex = exercises[i];
                await client.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
                    [workoutId, ex.name, ex.sets, ex.reps, ex.notes||'', i, ex.video_url||null, ex.image_url||null]
                );
            }
        }
        await client.query('COMMIT');
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [workoutId]);
        res.json({ success: true, clientId: w.rows[0].client_id });
    } catch(e) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: e.message });
    } finally { client.release(); }
});

router.use('/', trainerRouter);

// Rota Visualizar (Pública/Aluno)
router.get('/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        const workoutId = req.params.id;
        if (workoutId === 'create') return res.redirect('/workouts/create');

        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        
        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [workoutId]);
        
        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            user: req.session.user,
            currentPage: 'workouts'
        });
    } catch(e) { res.status(404).render('pages/error', { message: 'Treino não encontrado.' }); }
});

module.exports = router;
