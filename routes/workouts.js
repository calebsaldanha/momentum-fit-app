const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Rota para ver detalhes do treino (Usada pelo aluno)
router.get('/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // Busca cabeçalho do treino
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        
        if (workoutRes.rows.length === 0) {
            return res.status(404).render('pages/error', { message: "Treino não encontrado" });
        }

        // Busca exercícios do treino
        const exercisesRes = await db.query(`
            SELECT we.*, el.name, el.video_url, el.muscle_group 
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
        console.error("Erro ao carregar treino:", err);
        res.status(500).render('pages/error', { message: "Erro interno ao carregar treino." });
    }
});

module.exports = router;
