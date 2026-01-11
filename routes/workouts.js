const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewWorkoutEmail } = require('../utils/emailService');

const requireTrainer = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.', user: req.session.user });
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
            csrfToken: req.csrfToken(),
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error("Erro create workout:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página.', user: req.session.user });
    }
});

// POST: Salvar Novo Treino (CORRIGIDO)
router.post('/create', requireTrainer, async (req, res) => {
    const { client_id, title, day_of_week, description, exercises } = req.body; 
    
    try {
        // 1. Busca o ID real na tabela 'clients' usando o ID de usuário (user_id)
        const clientRes = await pool.query("SELECT id FROM clients WHERE user_id = $1", [client_id]);
        
        if (clientRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Este aluno ainda não completou a Anamnese (Perfil incompleto).' });
        }

        const realClientId = clientRes.rows[0].id;

        // 2. Insere com client_id correto e status 'pending'
        const result = await pool.query(
            "INSERT INTO workouts (user_id, client_id, trainer_id, title, day_of_week, description, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) RETURNING id",
            [client_id, realClientId, req.session.user.id, title, day_of_week, description]
        );
        const workoutId = result.rows[0].id;

        await saveExercises(workoutId, exercises);

        // Envia email
        const userRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [client_id]);
        if (userRes.rows[0]) {
            sendNewWorkoutEmail(userRes.rows[0].email, title, userRes.rows[0].name, req.headers.host).catch(console.error);
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
        
        // Segurança: Verificar se o treino pertence a este treinador (ou se é superadmin)
        let workoutQuery = "SELECT * FROM workouts WHERE id = $1";
        const queryParams = [workoutId];

        if (req.session.user.role !== 'superadmin') {
            workoutQuery += " AND trainer_id = $2";
            queryParams.push(req.session.user.id);
        }

        const workoutRes = await pool.query(workoutQuery, queryParams);
        const workout = workoutRes.rows[0];

        if (!workout) return res.status(404).render('pages/error', { message: 'Treino não encontrado ou acesso negado.', user: req.session.user });

        const userId = workout.user_id;
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
            csrfToken: req.csrfToken(),
            currentPage: 'create-workout' 
        });
    } catch (err) {
        console.error("Erro edit workout:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.', user: req.session.user });
    }
});

// POST: Atualizar Treino
router.post('/edit/:id', requireTrainer, async (req, res) => {
    const workoutId = req.params.id;
    const { title, day_of_week, description, exercises } = req.body;

    try {
        // Segurança no Update
        let updateQuery = "UPDATE workouts SET title = $1, day_of_week = $2, description = $3 WHERE id = $4";
        const queryParams = [title, day_of_week, description, workoutId];

        if (req.session.user.role !== 'superadmin') {
            updateQuery += " AND trainer_id = $5";
            queryParams.push(req.session.user.id);
        }

        const result = await pool.query(updateQuery, queryParams);
        
        if (result.rowCount === 0) {
             return res.status(403).json({ success: false, message: 'Permissão negada ou treino não existe.' });
        }

        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [workoutId]);
        await saveExercises(workoutId, exercises);

        const workoutRes = await pool.query("SELECT user_id FROM workouts WHERE id = $1", [workoutId]);
        const clientId = workoutRes.rows[0].user_id;

        res.json({ success: true, clientId: clientId });
    } catch (err) {
        console.error("Erro update workout:", err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    }
});

router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        // Segurança no Delete
        let deleteQuery = "DELETE FROM workouts WHERE id = $1";
        const queryParams = [req.params.id];

        if (req.session.user.role !== 'superadmin') {
            deleteQuery += " AND trainer_id = $2";
            queryParams.push(req.session.user.id);
        }

        await pool.query(deleteQuery, queryParams);
        res.redirect(req.get('referer') || '/trainer/dashboard');
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: "Erro ao excluir", user: req.session.user }); 
    }
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
