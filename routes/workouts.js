const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireTrainerAuth = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    return res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

// GET: Criar
router.get('/create', requireTrainerAuth, async (req, res) => {
    try {
        const clients = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name");
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            clients: clients.rows, 
            selectedClientId: req.query.clientId || '', 
            currentPage: 'create-workout' 
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar formulário.' });
    }
});

// POST: Salvar (Com Notificação)
router.post('/create', requireTrainerAuth, async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    const trainer_id = req.session.user.id;

    try {
        if (!client_id || !title || !exercises) {
            return res.status(400).json({ success: false, message: 'Dados incompletos.' });
        }

        const query = `
            INSERT INTO workouts (client_id, trainer_id, title, description, exercises, created_at) 
            VALUES ($1, $2, $3, $4, $5, NOW()) 
            RETURNING id
        `;
        const result = await pool.query(query, [client_id, trainer_id, title, description || '', JSON.stringify(exercises)]);
        const workoutId = result.rows[0].id;

        // --- NOTIFICAÇÃO ADICIONADA ---
        await notificationService.notifyNewWorkout(title, client_id, workoutId);
        
        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error("Erro ao criar treino:", err);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// GET: Editar
router.get('/edit/:id', requireTrainerAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT w.*, u.name as client_name FROM workouts w JOIN users u ON w.client_id = u.id WHERE w.id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });

        res.render('pages/edit-workout', { 
            title: 'Editar Treino', 
            workout: result.rows[0], 
            currentPage: 'admin-clients' 
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar edição.' });
    }
});

// POST: Editar
router.post('/edit/:id', requireTrainerAuth, async (req, res) => {
    const { title, description, exercises } = req.body;
    try {
        const result = await pool.query(
            "UPDATE workouts SET title = $1, description = $2, exercises = $3, updated_at = NOW() WHERE id = $4 RETURNING client_id",
            [title, description, JSON.stringify(exercises), req.params.id]
        );
        res.json({ success: true, clientId: result.rows[0].client_id });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar.' });
    }
});

// GET: Detalhes
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT w.*, t.name as trainer_name FROM workouts w LEFT JOIN users t ON w.trainer_id = t.id WHERE w.id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });

        res.render('pages/workout-details', { 
            title: result.rows[0].title, 
            workout: result.rows[0], 
            user: req.session.user, 
            currentPage: req.session.user.role === 'client' ? 'client-workouts' : 'admin-clients' 
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao ver detalhes.' });
    }
});

module.exports = router;
