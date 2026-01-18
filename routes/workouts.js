const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // 1. Pega dados do treino
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: "Treino não encontrado" });

        // 2. Pega exercícios (Query segura com LEFT JOIN na exercise_library)
        // O script de banco de dados ja deve ter criado a coluna exercise_id
        const exercisesRes = await db.query(`
            SELECT we.*, el.name as library_name, el.video_url, el.muscle_group 
            FROM workout_exercises we
            LEFT JOIN exercise_library el ON we.exercise_id = el.id
            WHERE we.workout_id = $1
            ORDER BY we.order_index ASC
        `, [workoutId]);

        res.render('pages/workout-details', { 
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows 
        });

    } catch (err) {
        console.error("Erro Workouts:", err);
        res.status(500).render('pages/error', { message: "Erro ao carregar detalhes do treino." });
    }
});

module.exports = router;
