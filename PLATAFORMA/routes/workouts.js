const express = require('express');
const router = express.Router();
const { pool } = require('../PLATAFORMA/database/db');
const { body, validationResult } = require('express-validator');
const notificationService = require('../../../utils/notificationService');

const requireAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
};

const requireAdminAuth = (req, res, next) => {
    if (req.session.user && ['trainer', 'superadmin'].includes(req.session.user.role)) return next();
    res.status(403).send('Acesso negado');
};

router.get('/create', requireAuth, requireAdminAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name");
        res.render('pages/create-workout', {
            title: 'Criar Treino',
            clients: result.rows
        });
    } catch (err) {
        console.error("Erro ao carregar clientes para criação de treino:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar a página.' });
    }
});

router.post('/create', requireAuth, requireAdminAuth, [
    body('client_id').isInt({ min: 1 }).withMessage('Cliente inválido.'),
    body('title').notEmpty().withMessage('O título é obrigatório.').trim(),
    body('exercises').isArray({ min: 1 }).withMessage('É necessário pelo menos um exercício.')
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { client_id, title, description, exercises } = req.body;
    const trainer_id = req.session.user.id;
    
    try {
        const query = 'INSERT INTO workouts (client_id, trainer_id, title, description, exercises) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const result = await pool.query(query, [client_id, trainer_id, title, description, JSON.stringify(exercises)]);
        const newWorkoutId = result.rows[0].id;

        await notificationService.notifyNewWorkout(title, client_id, newWorkoutId);

        res.json({ success: true, message: 'Treino criado com sucesso!', workoutId: newWorkoutId });
    } catch (err) {
        console.error("Erro ao criar treino:", err);
        res.status(500).json({ success: false, message: 'Erro ao salvar treino no banco de dados.' });
    }
});

router.get('/:id', requireAuth, async (req, res) => {
    try {
        const workoutId = req.params.id;
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        
        let query;
        let params = [workoutId, userId];

        if (userRole === 'client') {
            query = `SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.id = $1 AND w.client_id = $2`;
        } else {
            if (userRole === 'superadmin') {
                query = `SELECT w.*, u.name as client_name, t.name as trainer_name 
                         FROM workouts w 
                         JOIN users u ON w.client_id = u.id 
                         LEFT JOIN users t ON w.trainer_id = t.id
                         WHERE w.id = $1`;
                params = [workoutId];
            } else {
                query = `SELECT w.*, u.name as client_name FROM workouts w JOIN users u ON w.client_id = u.id WHERE w.id = $1 AND w.trainer_id = $2`;
            }
        }

        const workoutRes = await pool.query(query, params);
        if (workoutRes.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Treino não encontrado ou você não tem permissão para vê-lo.' });
        }
        
        const checkinsQuery = 'SELECT * FROM workout_checkins WHERE workout_id = $1 ORDER BY created_at DESC';
        const checkinsRes = await pool.query(checkinsQuery, [workoutId]);

        const workout = workoutRes.rows[0];
        res.render('pages/workout-details', {
            title: `Treino: ${workout.title}`,
            workout: workout,
            exercises: workout.exercises || [],
            checkins: checkinsRes.rows
        });
    } catch (err) {
        console.error("Erro ao detalhar treino:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar os detalhes do treino.' });
    }
});

router.post('/:id/checkin', requireAuth, [
    body('completed').isBoolean().withMessage('Status de conclusão inválido.'),
    body('rating').optional({ checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Nota deve ser entre 1 e 5.'),
    body('notes').trim()
], async (req, res) => {
    
    if (req.session.user.role !== 'client') {
        return res.status(403).json({ success: false, message: 'Apenas clientes podem fazer check-in.' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    try {
        const workoutId = req.params.id;
        const clientId = req.session.user.id;
        const { completed, notes, rating } = req.body;
        
        const isCompleted = completed === 'true' || completed === true;

        const query = 'INSERT INTO workout_checkins (workout_id, client_id, completed, notes, rating) VALUES ($1, $2, $3, $4, $5)';
        await pool.query(query, [workoutId, clientId, isCompleted, notes, rating || null]);
        
        res.json({ success: true, message: 'Check-in registrado com sucesso!' });
    } catch (err) {
        console.error("Erro ao registrar check-in:", err);
        res.status(500).json({ success: false, message: 'Não foi possível registrar o check-in.' });
    }
});

module.exports = router;
