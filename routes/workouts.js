const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireTrainerAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { role, status } = req.session.user;
    if (role === 'superadmin' || (role === 'trainer' && status === 'active')) return next();
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

// Renderizar formulário de criação (Onde estava o erro)
router.get('/create', requireTrainerAuth, async (req, res) => {
    try {
        const clientsRes = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name");
        res.render('pages/create-workout', { 
            title: 'Novo Treino - Momentum Fit', 
            clients: clientsRes.rows,
            selectedClientId: req.query.clientId || null,
            currentPage: 'create-workout'
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' });
    }
});

// Salvar novo treino
router.post('/create', requireTrainerAuth, async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    try {
        await pool.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, exercises) VALUES ($1, $2, $3, $4, $5)",
            [client_id, req.session.user.id, title, description, JSON.stringify(exercises)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao salvar treino.' });
    }
});

// Ver detalhes do treino (Funciona para aluno e treinador)
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT w.*, ut.name as trainer_name, uc.name as client_name 
            FROM workouts w 
            LEFT JOIN users ut ON w.trainer_id = ut.id 
            LEFT JOIN users uc ON w.client_id = uc.id 
            WHERE w.id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });
        res.render('pages/workout-details', { 
            title: 'Detalhes do Treino', 
            workout: result.rows[0], 
            currentPage: 'workouts' 
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar detalhes.' });
    }
});

module.exports = router;
