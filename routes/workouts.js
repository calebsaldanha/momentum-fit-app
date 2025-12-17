const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

// Detalhes do Treino (Acessível por Aluno e Treinador)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id: userId, role } = req.session.user;
        const workoutId = req.params.id;

        const query = `
            SELECT w.*, ut.name as trainer_name, uc.name as client_name
            FROM workouts w
            LEFT JOIN users ut ON w.trainer_id = ut.id
            LEFT JOIN users uc ON w.client_id = uc.id
            WHERE w.id = $1
        `;
        const result = await pool.query(query, [workoutId]);

        if (result.rows.length === 0) {
            return res.status(404).render('pages/error', { title: 'Erro', message: 'Treino não encontrado.' });
        }

        const workout = result.rows[0];

        // Segurança: Aluno só vê o próprio treino
        if (role === 'client' && workout.client_id !== userId) {
            return res.status(403).render('pages/error', { title: 'Acesso Negado', message: 'Este treino não pertence a você.' });
        }

        res.render('pages/workout-details', {
            title: `Treino: ${workout.title}`,
            workout: workout,
            user: req.session.user
        });
    } catch (err) {
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar treino.' });
    }
});

module.exports = router;
