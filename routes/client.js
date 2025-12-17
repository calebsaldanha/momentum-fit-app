const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.get('/dashboard', requireClientAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Busca treinos com LEFT JOIN para garantir que apareçam mesmo sem treinador vinculado
        const workoutsRes = await pool.query(
            "SELECT w.*, COALESCE(u.name, 'Sem Treinador') as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC",
            [userId]
        );

        // Busca histórico de check-ins para o gráfico
        const checkinsRes = await pool.query(
            "SELECT created_at::date as date, COUNT(*) as count FROM workout_checkins WHERE client_id = $1 AND completed = true GROUP BY date ORDER BY date ASC LIMIT 7",
            [userId]
        );

        res.render('pages/client-dashboard', {
            title: 'Meu Dashboard - Momentum Fit',
            workouts: workoutsRes.rows || [],
            checkins: checkinsRes.rows || [],
            user: req.session.user
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar dashboard.' });
    }
});

module.exports = router;
