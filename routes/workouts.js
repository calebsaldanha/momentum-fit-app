const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(requireTrainerAuth);

// Rota de Criação
router.get('/create', async (req, res) => {
    try {
        const { role, id } = req.session.user;
        let clientsQuery;
        let params = [];
        if (role === 'superadmin') {
            clientsQuery = "SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name";
        } else {
            clientsQuery = "SELECT u.id, u.name, u.email FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.role = 'client' AND cp.assigned_trainer_id = $1 ORDER BY u.name";
            params = [id];
        }
        const clientsRes = await pool.query(clientsQuery, params);
        res.render('pages/create-workout', {
            title: 'Criar Treino - Momentum Fit',
            clients: clientsRes.rows,
            selectedClientId: req.query.clientId || ''
        });
    } catch (err) {
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar formulário.' });
    }
});

// Rota de Edição (DEVE vir antes de /:id)
router.get('/edit/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query(`
            SELECT w.*, u.name as client_name 
            FROM workouts w 
            JOIN users u ON w.client_id = u.id 
            WHERE w.id = $1
        `, [req.params.id]);

        if (workoutRes.rows.length === 0) {
            return res.status(404).render('pages/error', { title: 'Não Encontrado', message: 'Treino não encontrado.' });
        }

        res.render('pages/edit-workout', {
            title: 'Editar Treino - Momentum Fit',
            workout: workoutRes.rows[0],
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro interno.' });
    }
});

// Processar Edição
router.post('/edit/:id', async (req, res) => {
    const { title, description, exercises, client_id } = req.body;
    try {
        await pool.query(
            "UPDATE workouts SET title = $1, description = $2, exercises = $3, updated_at = NOW() WHERE id = $4",
            [title, description, JSON.stringify(exercises), req.params.id]
        );
        res.json({ success: true, clientId: client_id });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao salvar.' });
    }
});

// Detalhes do Treino
router.get('/:id', async (req, res) => {
    try {
        const workoutRes = await pool.query(`
            SELECT w.*, ut.name as trainer_name, uc.name as client_name
            FROM workouts w
            LEFT JOIN users ut ON w.trainer_id = ut.id
            LEFT JOIN users uc ON w.client_id = uc.id
            WHERE w.id = $1
        `, [req.params.id]);

        if (workoutRes.rows.length === 0) {
            return res.status(404).render('pages/error', { title: 'Não Encontrado', message: 'Treino não encontrado.' });
        }

        res.render('pages/workout-details', {
            title: 'Detalhes do Treino',
            workout: workoutRes.rows[0],
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar detalhes.' });
    }
});

module.exports = router;
