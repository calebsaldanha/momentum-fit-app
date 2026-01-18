const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware
router.use((req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
});

// 1. Rota de Interface de Criação (Acessada pelo botão "Criar Treino")
// ATENÇÃO: Definida antes de /:id para não conflitar
router.get('/create', async (req, res) => {
    const userId = req.query.userId; // Pega user ID da query string ?userId=26
    if (!userId) return res.redirect('/admin/dashboard');

    try {
        const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
        const libraryRes = await db.query("SELECT * FROM exercise_library ORDER BY name ASC");
        
        res.render('pages/create-workout', { 
            client: userRes.rows[0],
            exercises: libraryRes.rows 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar criador.");
    }
});

// 2. Rota que processa a criação
router.post('/create', async (req, res) => {
    const { clientId, title, description, day_of_week, selected_exercises } = req.body;
    try {
        await db.query('BEGIN');
        const workoutRes = await db.query(
            "INSERT INTO workouts (user_id, trainer_id, title, description, day_of_week) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [clientId, req.session.user.id, title, description, day_of_week]
        );
        const workoutId = workoutRes.rows[0].id;

        if (selected_exercises) {
            const exercises = Array.isArray(selected_exercises) ? selected_exercises : [selected_exercises];
            for (let i = 0; i < exercises.length; i++) {
                await db.query(
                    "INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, load, order_index) VALUES ($1, $2, 3, 12, '0', $3)",
                    [workoutId, exercises[i], i + 1]
                );
            }
        }
        await db.query('COMMIT');
        req.flash('success', 'Treino criado!');
        
        if(req.session.user.role.includes('admin')) {
            res.redirect(`/admin/users/${clientId}`);
        } else {
            res.redirect(`/trainer/clients/${clientId}`);
        }
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro ao criar.');
        res.redirect(`/admin/users/${clientId}`);
    }
});

// 3. Detalhes do Treino
router.get('/:id', async (req, res) => {
    try {
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: "Treino não encontrado" });
        
        const exercisesRes = await db.query(`
            SELECT we.*, el.name, el.muscle_group, el.video_url, el.image_url 
            FROM workout_exercises we 
            LEFT JOIN exercise_library el ON we.exercise_id = el.id 
            WHERE we.workout_id = $1 ORDER BY we.order_index`, [req.params.id]);

        let library = [];
        if (req.session.user.role !== 'client') {
            const libRes = await db.query("SELECT * FROM exercise_library ORDER BY name ASC");
            library = libRes.rows;
        }

        res.render('pages/workout-details', { workout: workoutRes.rows[0], exercises: exercisesRes.rows, library });
    } catch (e) { res.status(500).send('Erro interno'); }
});

// Ações de Edição (POSTs)...
router.post('/:id/add-exercise', async (req, res) => {
    const { exercise_id, sets, reps, load } = req.body;
    await db.query("INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, load, order_index) VALUES ($1, $2, $3, $4, $5, 99)", [req.params.id, exercise_id, sets, reps, load]);
    res.redirect(`/workouts/${req.params.id}`);
});
router.post('/:id/remove-exercise/:eid', async (req, res) => {
    await db.query("DELETE FROM workout_exercises WHERE id = $1", [req.params.eid]);
    res.redirect(`/workouts/${req.params.id}`);
});
router.post('/:id/update-exercise/:eid', async (req, res) => {
    const { sets, reps, load } = req.body;
    await db.query("UPDATE workout_exercises SET sets=$1, reps=$2, load=$3 WHERE id=$4", [sets, reps, load, req.params.eid]);
    res.redirect(`/workouts/${req.params.id}`);
});

module.exports = router;
