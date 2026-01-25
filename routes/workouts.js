const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

const isTrainer = [ensureAuthenticated, ensureRole('trainer')];

// Listar Meus Treinos (Templates e Atribuídos)
router.get('/', isTrainer, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT w.*, u.name as client_name 
            FROM workouts w
            LEFT JOIN users u ON w.client_id = u.id
            WHERE w.creator_id = $1 AND w.is_active = true
            ORDER BY w.created_at DESC
        `, [req.user.id]);
        
        res.render('pages/trainer-workouts', {
            user: req.user,
            workouts: result.rows,
            path: '/trainer/workouts',
            title: 'Gestão de Treinos'
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao listar treinos', error: err, title: 'Erro' });
    }
});

// Tela de Criação (Wizard)
router.get('/create', isTrainer, async (req, res) => {
    try {
        // Buscar alunos para o select
        const clients = await pool.query(`
            SELECT u.id, u.name FROM assignments a
            JOIN users u ON a.client_id = u.id
            WHERE a.trainer_id = $1 AND a.status = 'active'
        `, [req.user.id]);

        // Buscar exercícios para a biblioteca
        const exercises = await pool.query('SELECT * FROM exercises ORDER BY name ASC');

        res.render('pages/create-workout', {
            user: req.user,
            clients: clients.rows,
            exercises: exercises.rows,
            path: '/trainer/workouts/create',
            title: 'Novo Treino'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/trainer/workouts');
    }
});

// Processar Criação (POST)
router.post('/create', isTrainer, async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, description, client_id, exercises } = req.body;
        // exercises vem como JSON string do front ou array de objetos
        const exerciseList = JSON.parse(exercises);

        await client.query('BEGIN');

        // 1. Criar o Header do Treino
        const workoutRes = await client.query(`
            INSERT INTO workouts (creator_id, client_id, name, description, is_active)
            VALUES ($1, $2, $3, $4, true)
            RETURNING id
        `, [req.user.id, client_id || null, name, description]);

        const workoutId = workoutRes.rows[0].id;

        // 2. Inserir Exercícios
        let order = 0;
        for (const ex of exerciseList) {
            await client.query(`
                INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, rest_seconds, notes, "order")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [workoutId, ex.id, ex.sets, ex.reps, ex.rest, ex.notes, order++]);
        }

        await client.query('COMMIT');
        
        // Notificar aluno se foi atribuído
        if (client_id) {
             await client.query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES ($1, 'workout', 'Novo Treino', 'Seu treinador enviou um novo treino: ' || $2)
            `, [client_id, name]);
        }

        req.flash('success', 'Treino criado com sucesso!');
        res.json({ success: true, redirect: '/trainer/workouts' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar treino' });
    } finally {
        client.release();
    }
});

module.exports = router;
