const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewWorkoutEmail } = require('../utils/emailService');

const requireTrainer = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

router.get('/', requireTrainer, async (req, res) => {
    if (req.session.user.role === 'trainer') {
        return res.redirect('/trainer/dashboard');
    }
    res.redirect('/admin/dashboard');
});

// GET: Página de Criação
router.get('/create', requireTrainer, async (req, res) => {
    const clientId = req.query.client_id;
    try {
        let selectedClient = null;
        if (clientId) {
            const clientRes = await pool.query("SELECT id, name FROM users WHERE id = $1", [clientId]);
            selectedClient = clientRes.rows[0];
        }

        const allClientsRes = await pool.query("SELECT id, name FROM users WHERE role = 'client' ORDER BY name ASC");
        const exercisesRes = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            user: req.session.user, 
            selectedClient: selectedClient, 
            clients: allClientsRes.rows,
            selectedClientId: clientId, 
            exerciseLibrary: exercisesRes.rows, 
            csrfToken: res.locals.csrfToken,
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error("Erro create workout:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página.' });
    }
});

// POST: Salvar Novo Treino
router.post('/create', requireTrainer, async (req, res) => {
    const { client_id, title, day_of_week, description, exercises } = req.body; 
    
    try {
        const result = await pool.query(
            "INSERT INTO workouts (user_id, trainer_id, title, day_of_week, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
            [client_id, req.session.user.id, title, day_of_week, description]
        );
        const workoutId = result.rows[0].id;

        await saveExercises(workoutId, exercises);

        const clientRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [client_id]);
        if (clientRes.rows[0]) {
            sendNewWorkoutEmail(clientRes.rows[0].email, title, clientRes.rows[0].name, req.headers.host).catch(console.error);
        }

        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error("Erro save workout:", err);
        res.status(500).json({ success: false, message: 'Erro ao salvar.' });
    }
});

// GET: Página de Edição
router.get('/edit/:id', requireTrainer, async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        const workout = workoutRes.rows[0];

        if (!workout) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });

        const userId = workout.client_id || workout.user_id;
        const clientRes = await pool.query("SELECT id, name FROM users WHERE id = $1", [userId]);
        const selectedClient = clientRes.rows[0];

        const currentExercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [workoutId]);
        const exercisesRes = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/edit-workout', { 
            title: 'Editar Treino', 
            user: req.session.user,
            workout: workout,
            currentExercises: currentExercisesRes.rows,
            selectedClient: selectedClient,
            selectedClientId: userId,
            exerciseLibrary: exercisesRes.rows,
            csrfToken: res.locals.csrfToken,
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error("Erro edit workout:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// POST: Atualizar Treino
router.post('/edit/:id', requireTrainer, async (req, res) => {
    const workoutId = req.params.id;
    const { title, day_of_week, description, exercises } = req.body;

    try {
        await pool.query(
            "UPDATE workouts SET title = $1, day_of_week = $2, description = $3 WHERE id = $4",
            [title, day_of_week, description, workoutId]
        );

        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
        await saveExercises(workoutId, exercises);

        const workoutRes = await pool.query("SELECT client_id, user_id FROM workouts WHERE id = $1", [workoutId]);
        const clientId = workoutRes.rows[0].client_id || workoutRes.rows[0].user_id;

        res.json({ success: true, clientId: clientId });
    } catch (err) {
        console.error("Erro update workout:", err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    }
});

router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        res.redirect(req.get('referer'));
    } catch (err) { res.status(500).send("Erro ao excluir"); }
});

async function saveExercises(workoutId, exercises) {
    let exList = [];
    if (typeof exercises === 'string') {
            try { exList = JSON.parse(exercises); } catch(e) {}
    } else if (Array.isArray(exercises)) {
        exList = exercises;
    }

    for (let ex of exList) {
        let libraryId = ex.id || null; 
        if (libraryId === '') libraryId = null;

        let exerciseName = ex.name;

        if (libraryId) {
            const libRes = await pool.query("SELECT name FROM exercise_library WHERE id = $1", [libraryId]);
            if (libRes.rows[0]) {
                exerciseName = libRes.rows[0].name;
            }
        } else {
            exerciseName = ex.name || 'Exercício Personalizado';
        }

        await pool.query(
            "INSERT INTO workout_exercises (workout_id, library_id, name, sets, reps, weight, notes, video_url, image_url, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [workoutId, libraryId, exerciseName, ex.sets, ex.reps, ex.weight, ex.notes, ex.video_url, ex.image_url, ex.order_index]
        );
    }
}

module.exports = router;
