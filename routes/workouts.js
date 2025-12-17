const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(requireTrainerAuth);

// Detalhes do Treino (Visualização)
router.get('/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        const workoutRes = await pool.query(`
            SELECT w.*, ut.name as trainer_name, uc.name as client_name
            FROM workouts w
            LEFT JOIN users ut ON w.trainer_id = ut.id
            LEFT JOIN users uc ON w.client_id = uc.id
            WHERE w.id = $1
        `, [workoutId]);

        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });

        res.render('pages/workout-details', {
            title: 'Detalhes do Treino',
            workout: workoutRes.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes do treino.' });
    }
});

// GET Edição
router.get('/edit/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        
        const workout = result.rows[0];
        res.render('pages/edit-workout', { 
            title: 'Editar Treino',
            workout: workout,
            exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// POST Edição
router.post('/edit/:id', async (req, res) => {
    const { title, description, exercises } = req.body;
    try {
        // No Postgres com JSONB, enviamos o objeto/array diretamente e o driver trata
        await pool.query(
            "UPDATE workouts SET title = $1, description = $2, exercises = $3, updated_at = NOW() WHERE id = $4",
            [title, description, JSON.stringify(exercises), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    }
});

module.exports = router;
