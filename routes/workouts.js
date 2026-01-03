const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

// Middleware de Proteção
const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado: Apenas treinadores.' });
};

// 1. Tela de Criar (GET)
router.get('/create', requireTrainerAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        
        let query = userRole === 'superadmin' 
            ? "SELECT id, name FROM users WHERE role = 'client' AND status = 'active' ORDER BY name"
            : `SELECT u.id, u.name FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE cp.assigned_trainer_id = $1 AND u.status = 'active' ORDER BY u.name`;
        
        const params = userRole === 'superadmin' ? [] : [userId];
        const clients = await pool.query(query, params);
        
        const library = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");

        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            clients: clients.rows, 
            exerciseLibrary: library.rows,
            selectedClientId: req.query.client_id || '', 
            user: req.session.user, 
            currentPage: 'create-workout',
            csrfToken: res.locals.csrfToken || ''
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' }); 
    }
});

// 2. Salvar Treino (POST)
router.post('/create', requireTrainerAuth, async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    
    if (!client_id || !title || !exercises) return res.status(400).json({ success: false, message: 'Dados inválidos.' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const wRes = await client.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id", 
            [client_id, req.session.user.id, title, description||'']
        );
        const wid = wRes.rows[0].id;
        
        for (const ex of exercises) {
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
        await client.query('ROLLBACK'); 
        console.error(e); 
        res.status(500).json({ success: false, message: 'Erro ao salvar.' }); 
    } finally { client.release(); }
});

// 3. Excluir (POST)
router.post('/delete/:id', requireTrainerAuth, async (req, res) => {
    try {
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [req.params.id]);
        if (w.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado.' });
        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        res.redirect('/admin/clients/' + w.rows[0].client_id);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); }
});

// 4. Editar (GET)
router.get("/edit/:id", requireTrainerAuth, async (req, res) => {
    try {
        const wRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (wRes.rows.length === 0) return res.status(404).render("pages/error", { message: "Não encontrado." });
        
        const exRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);
        const library = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");

        res.render("pages/edit-workout", {
            title: "Editar Treino",
            workout: wRes.rows[0],
            exercises: exRes.rows,
            exerciseLibrary: library.rows,
            user: req.session.user,
            currentPage: "create-workout",
            csrfToken: res.locals.csrfToken || ''
        });
    } catch (err) { 
        console.error(err);
        res.status(500).render("pages/error", { message: "Erro ao carregar edição." }); 
    }
});

// 5. Salvar Edição (POST)
router.post('/edit/:id', requireTrainerAuth, async (req, res) => {
    const { title, description, exercises } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("UPDATE workouts SET title = $1, description = $2 WHERE id = $3", [title, description, req.params.id]);
        
        // Remove exercícios antigos e insere os novos
        await client.query("DELETE FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
        
        if (exercises && Array.isArray(exercises)) {
            for (const ex of exercises) {
                await client.query(
                    "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
                    [req.params.id, ex.name, ex.sets, ex.reps, ex.notes||'', ex.order_index, ex.video_url||null, ex.image_url||null]
                );
            }
        }
        await client.query('COMMIT');
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [req.params.id]);
        res.json({ success: true, clientId: w.rows[0].client_id });
    } catch(e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally { client.release(); }
});

// ROTA PÚBLICA / ALUNO
router.get('/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const workoutId = req.params.id;
        if (workoutId === 'create') return res.redirect('/workouts/create');

        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });

        let profile = {};
        if (req.session.user.role === 'client') {
            const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
            profile = profileRes.rows[0] || {};
        }

        const exercisesQuery = `
            SELECT 
                we.id, we.workout_id, we.name, we.sets, we.reps, we.notes, we.order_index, we.video_url,
                COALESCE(we.image_url, el.image_url) as image_url,
                el.description, el.execution_instructions, el.tips, el.recommendations
            FROM workout_exercises we
            LEFT JOIN exercise_library el ON LOWER(TRIM(we.name)) = LOWER(TRIM(el.name))
            WHERE we.workout_id = $1 
            ORDER BY we.order_index ASC
        `;

        const exercisesRes = await pool.query(exercisesQuery, [workoutId]);

        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            user: req.session.user,
            profile: profile,
            currentPage: 'workouts'
        });

    } catch(e) { 
        console.error("Erro ao carregar treino:", e); 
        res.status(500).render('pages/error', { message: 'Erro interno ao carregar o treino.' }); 
    }
});

module.exports = router;
