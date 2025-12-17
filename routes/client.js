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
        // Busca todos os treinos do aluno sem limite de 1
        const workoutsRes = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC",
            [userId]
        );
        res.render('pages/client-dashboard', { 
            title: 'Meu Dashboard', 
            workouts: workoutsRes.rows 
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

module.exports = router;
