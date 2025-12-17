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

// Formulário de Edição
router.get('/edit/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        
        res.render('pages/edit-workout', { 
            title: 'Editar Treino',
            workout: result.rows[0],
            exercises: JSON.parse(result.rows[0].exercises || '[]'),
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// Processar Edição
router.post('/edit/:id', async (req, res) => {
    const { title, description, exercises } = req.body;
    try {
        await pool.query(
            "UPDATE workouts SET title = $1, description = $2, exercises = $3, updated_at = NOW() WHERE id = $4",
            [title, description, JSON.stringify(exercises), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar treino.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT w.*, ut.name as trainer_name FROM workouts w LEFT JOIN users ut ON w.trainer_id = ut.id WHERE w.id = $1", [req.params.id]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        res.render('pages/workout-details', { workout: workoutRes.rows[0] });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao ver treino.' });
    }
});

module.exports = router;
