const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') {
        return next();
    }
    res.redirect('/auth/login');
};

router.get('/dashboard', requireClientAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Busca todos os treinos do aluno (suporta múltiplos treinos ativos)
        const workoutsRes = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC",
            [userId]
        );

        // Busca o histórico de check-ins para o gráfico de progresso
        const checkinsRes = await pool.query(
            "SELECT * FROM workout_checkins WHERE client_id = $1 ORDER BY created_at ASC",
            [userId]
        );

        res.render('pages/client-dashboard', {
            title: 'Meu Dashboard - Momentum Fit',
            workouts: workoutsRes.rows,
            checkins: checkinsRes.rows,
            user: req.session.user
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar dashboard.' });
    }
});

module.exports = router;
