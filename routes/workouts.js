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
    res.redirect('/admin/dashboard');
});

// GET: Página de Criação
router.get('/create', requireTrainer, async (req, res) => {
    const clientId = req.query.client_id;
    try {
        const clientRes = await pool.query("SELECT id, name FROM users WHERE id = $1", [clientId]);
        // CORREÇÃO: Nome da tabela alterado de 'exercises' para 'exercise_library'
        const exercisesRes = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            user: req.session.user, 
            client: clientRes.rows[0],
            exerciseLibrary: exercisesRes.rows, 
            csrfToken: res.locals.csrfToken,
            currentPage: 'workouts'
        });
    } catch (err) {
        console.error("Erro ao carregar página de treino:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página de treino.' });
    }
});

// POST: Salvar Treino
router.post('/create', requireTrainer, async (req, res) => {
    const { client_id, title, day_of_week, description, exercises } = req.body; 
    
    try {
        const result = await pool.query(
            "INSERT INTO workouts (user_id, trainer_id, title, day_of_week, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
            [client_id, req.session.user.id, title, day_of_week, description]
        );
        const workoutId = result.rows[0].id;

        let exList = [];
        if (typeof exercises === 'string') {
             try { exList = JSON.parse(exercises); } catch(e) {}
        } else if (Array.isArray(exercises)) {
            exList = exercises;
        }

        for (let ex of exList) {
            // CORREÇÃO: Busca o nome do exercício na biblioteca para preencher o campo 'name' obrigatório
            // e usa 'library_id' em vez de 'exercise_id'
            const libRes = await pool.query("SELECT name FROM exercise_library WHERE id = $1", [ex.id]);
            const exerciseName = libRes.rows[0] ? libRes.rows[0].name : 'Exercício Personalizado';

             await pool.query(
                 "INSERT INTO workout_exercises (workout_id, library_id, name, sets, reps, weight, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                 [workoutId, ex.id, exerciseName, ex.sets, ex.reps, ex.weight, ex.notes]
             );
        }

        // Email Notification
        const clientRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [client_id]);
        if (clientRes.rows[0]) {
            sendNewWorkoutEmail(clientRes.rows[0].email, title, clientRes.rows[0].name, req.headers.host).catch(console.error);
        }

        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error("Erro ao salvar treino:", err);
        res.status(500).json({ success: false, message: 'Erro ao salvar treino.' });
    }
});

router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        res.redirect(req.get('referer'));
    } catch (err) { res.status(500).send("Erro ao excluir"); }
});

module.exports = router;
