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

// Rota de Detalhes (Visível para Alunos e Personais)
// IMPORTANTE: Esta rota deve vir ANTES das rotas protegidas se for pública, ou ajustada.
// No seu caso, parece ser protegida. Adicionarei a limpeza aqui.
router.get('/:id', async (req, res) => {
    // Permitir acesso a alunos também para ver seus treinos
    if (!req.session.user) return res.redirect('/auth/login');

    try {
        const workoutId = req.params.id;
        const userId = req.session.user.id;

        // --- NOVO: Limpa notificações relacionadas a este treino específico ---
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND link = $2",
            [userId, `/workouts/${workoutId}`]
        );

        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado.' });
        
        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [workoutId]);
        
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

// Rotas exclusivas de Personal (agrupadas)
const trainerRouter = express.Router();
trainerRouter.use(requireTrainerAuth);

trainerRouter.get('/create', async (req, res) => {
    // ... (Mantém lógica original de create)
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
        res.render('pages/create-workout', { title: 'Novo Treino', clients: clients.rows, selectedClientId: req.query.client_id || '', csrfToken: res.locals.csrfToken, user: req.session.user, currentPage: 'create-workout' });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro.' }); }
});

trainerRouter.post('/create', async (req, res) => {
    // ... (Mantém lógica original de POST create)
    const { client_id, title, description, exercises } = req.body;
    if (!client_id || !title || !exercises) return res.status(400).json({ success: false, message: 'Dados inválidos' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const wRes = await client.query("INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id", [client_id, req.session.user.id, title, description||'']);
        const wid = wRes.rows[0].id;
        for (let i=0; i<exercises.length; i++) {
            const ex = exercises[i];
            await client.query("INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7)", [wid, ex.name, ex.sets, ex.reps, ex.description||'', i, ex.video_url||null]);
        }
        await client.query('COMMIT');
        await notificationService.notifyNewWorkout(title, client_id, wid, req.session.user.name);
        res.json({ success: true, clientId: client_id });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ success: false }); } finally { client.release(); }
});

trainerRouter.get('/edit/:id', async (req, res) => {
    // ... (Mantém lógica edit)
    try {
        const wRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (wRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado' });
        const exRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);
        res.render('pages/edit-workout', { title: 'Editar', workout: wRes.rows[0], exercises: exRes.rows, csrfToken: res.locals.csrfToken, user: req.session.user, currentPage: 'workouts' });
    } catch (e) { res.status(500).render('pages/error', { message: 'Erro.' }); }
});

trainerRouter.post('/edit/:id', async (req, res) => {
    // ... (Mantém lógica POST edit)
    const { title, description, exercises } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("UPDATE workouts SET title=$1, description=$2, updated_at=NOW() WHERE id=$3", [title, description, req.params.id]);
        await client.query("DELETE FROM workout_exercises WHERE workout_id=$1", [req.params.id]);
        if(exercises) {
            for(let i=0; i<exercises.length; i++){
                const ex = exercises[i];
                await client.query("INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7)", [req.params.id, ex.name, ex.sets, ex.reps, ex.description||'', i, ex.video_url||null]);
            }
        }
        await client.query('COMMIT');
        const w = await client.query("SELECT client_id FROM workouts WHERE id=$1", [req.params.id]);
        await notificationService.notifyWorkoutUpdate(title, w.rows[0].client_id, req.session.user.name);
        res.json({ success: true, clientId: w.rows[0].client_id });
    } catch(e) { await client.query('ROLLBACK'); res.status(500).json({success:false}); } finally { client.release(); }
});

trainerRouter.post('/delete/:id', async (req, res) => {
    try {
        const w = await pool.query("SELECT client_id FROM workouts WHERE id=$1", [req.params.id]);
        if(w.rows.length>0) {
            await pool.query("DELETE FROM workout_exercises WHERE workout_id=$1", [req.params.id]);
            await pool.query("DELETE FROM workouts WHERE id=$1", [req.params.id]);
            res.redirect('/admin/clients/'+w.rows[0].client_id);
        } else res.redirect('/admin/dashboard');
    } catch(e) { res.status(500).render('pages/error', { message: 'Erro.' }); }
});

// Montagem das rotas
router.use('/', trainerRouter); // Aplica as rotas de trainer primeiro
module.exports = router;
