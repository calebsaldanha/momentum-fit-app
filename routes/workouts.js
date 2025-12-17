const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Rota para visualizar detalhes (já deve existir)
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        res.render('pages/workout-details', { workout: result.rows[0] });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar treino.' });
    }
});

// Rota para carregar o formulário de edição
router.get('/edit/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        
        // Passamos o treino para o arquivo views/pages/edit-workout.ejs
        res.render('pages/edit-workout', { 
            title: 'Editar Treino',
            workout: result.rows[0],
            exercises: JSON.parse(result.rows[0].exercises)
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário de edição.' });
    }
});

module.exports = router;
