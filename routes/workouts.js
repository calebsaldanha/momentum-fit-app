const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de autenticação
router.use((req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
});

router.get('/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // 1. Dados do Treino
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: "Treino não encontrado" });
        const workout = workoutRes.rows[0];

        // 2. Exercícios do Treino (COM IMAGEM)
        const currentExercises = await db.query(`
            SELECT we.*, el.name, el.video_url, el.muscle_group, el.image_url 
            FROM workout_exercises we
            LEFT JOIN exercise_library el ON we.exercise_id = el.id
            WHERE we.workout_id = $1
            ORDER BY we.order_index ASC
        `, [workoutId]);

        // 3. Biblioteca Completa (Para Admin adicionar - COM IMAGEM)
        let library = [];
        if (req.session.user.role !== 'client') {
            // Garante que traz a imagem
            const libRes = await db.query("SELECT id, name, muscle_group, image_url FROM exercise_library ORDER BY name ASC");
            library = libRes.rows;
        }

        res.render('pages/workout-details', { 
            workout, 
            exercises: currentExercises.rows,
            library
        });

    } catch (err) {
        console.error("Erro Workouts:", err);
        res.status(500).render('pages/error', { message: "Erro ao carregar treino." });
    }
});

// Ações de Update/Insert (Mantidas iguais, apenas para garantir o arquivo completo)
router.post('/:id/update', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    const { title, description, day_of_week } = req.body;
    await db.query("UPDATE workouts SET title=$1, description=$2, day_of_week=$3 WHERE id=$4", [title, description, day_of_week, req.params.id]);
    res.redirect(`/workouts/${req.params.id}`);
});

router.post('/:id/add-exercise', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    const { exercise_id, sets, reps, load } = req.body;
    const maxOrder = await db.query("SELECT MAX(order_index) as max FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
    const nextOrder = (maxOrder.rows[0].max || 0) + 1;
    await db.query(`INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, load, order_index) VALUES ($1, $2, $3, $4, $5, $6)`, 
        [req.params.id, exercise_id, sets, reps, load || '0', nextOrder]);
    res.redirect(`/workouts/${req.params.id}`);
});

router.post('/:id/remove-exercise/:weId', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    await db.query("DELETE FROM workout_exercises WHERE id = $1", [req.params.weId]);
    res.redirect(`/workouts/${req.params.id}`);
});

router.post('/:id/update-exercise/:weId', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    const { sets, reps, load } = req.body;
    await db.query("UPDATE workout_exercises SET sets=$1, reps=$2, load=$3 WHERE id=$4", [sets, reps, load, req.params.weId]);
    res.redirect(`/workouts/${req.params.id}`);
});

module.exports = router;
