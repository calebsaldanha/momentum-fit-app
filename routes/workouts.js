const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { sendNewWorkoutEmail } = require('../utils/emailService');

const requireTrainer = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).render('pages/error', { message: 'Acesso negado.' });
};

// ... Rotas de listar ...
router.get('/', requireTrainer, async (req, res) => {
    res.redirect('/admin/dashboard');
});

// Página Criar
router.get('/create', requireTrainer, async (req, res) => {
    const clientId = req.query.client_id;
    try {
        // Carrega cliente
        const clientRes = await pool.query("SELECT id, name FROM users WHERE id = $1", [clientId]);
        
        // CORREÇÃO: Carrega Biblioteca de Exercícios
        const exercisesRes = await pool.query("SELECT * FROM exercises ORDER BY name ASC");
        
        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            user: req.session.user, 
            client: clientRes.rows[0],
            exerciseLibrary: exercisesRes.rows, // Envia para a view
            csrfToken: res.locals.csrfToken,
            currentPage: 'workouts'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página de treino.' });
    }
});

// POST Criar Treino
router.post('/create', requireTrainer, async (req, res) => {
    const { client_id, title, day_of_week, description, exercises } = req.body; 
    
    try {
        const result = await pool.query(
            "INSERT INTO workouts (user_id, trainer_id, title, day_of_week, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
            [client_id, req.session.user.id, title, day_of_week, description]
        );
        const workoutId = result.rows[0].id;

        let exList = [];
        if (typeof exercises === 'string') {
             try { exList = JSON.parse(exercises); } catch(e) {}
        } else if (Array.isArray(exercises)) {
            exList = exercises;
        }

        for (let ex of exList) {
             await pool.query(
                 "INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight, notes) VALUES ($1, $2, $3, $4, $5, $6)",
                 [workoutId, ex.id, ex.sets, ex.reps, ex.weight, ex.notes]
             );
        }

        const clientRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [client_id]);
        const client = clientRes.rows[0];
        const adminRes = await pool.query("SELECT email FROM users WHERE role = 'superadmin' LIMIT 1");

        if (client) {
            sendNewWorkoutEmail(client.email, title, client.name, req.headers.host).catch(console.error);
        }
        if (adminRes.rows.length > 0) {
            sendNewWorkoutEmail(adminRes.rows[0].email, title, `${client.name} (Criado por ${req.session.user.name})`, req.headers.host).catch(console.error);
        }

        res.json({ success: true, clientId: client_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao salvar treino.' });
    }
});

router.post('/delete/:id', requireTrainer, async (req, res) => {
    try {
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        res.redirect(req.get('referer'));
    } catch (err) {
        res.status(500).send("Erro ao excluir");
    }
});

router.get('/edit/:id', requireTrainer, async (req, res) => {
    res.redirect('/admin/clients'); 
});

module.exports = router;
