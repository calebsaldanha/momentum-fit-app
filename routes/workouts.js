const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// --- VISUALIZAR DETALHES DO TREINO (Client & Trainer) ---
router.get('/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // Busca Treino
        const workoutQuery = `
            SELECT w.*, u.name as trainer_name 
            FROM workouts w
            LEFT JOIN users u ON w.trainer_id = u.id
            WHERE w.id = $1
        `;
        const workoutRes = await db.query(workoutQuery, [workoutId]);
        
        if (workoutRes.rows.length === 0) {
            req.flash('error', 'Treino não encontrado.');
            return res.redirect('/');
        }
        const workout = workoutRes.rows[0];

        // Busca Exercícios
        const exercisesQuery = `
            SELECT we.*, el.name as original_name, el.video_url, el.image_url
            FROM workout_exercises we
            LEFT JOIN exercise_library el ON we.exercise_id = el.id
            WHERE we.workout_id = $1
            ORDER BY we.order_index ASC
        `;
        const exercisesRes = await db.query(exercisesQuery, [workoutId]);

        res.render('pages/workout-details', {
            workout,
            exercises: exercisesRes.rows,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao carregar treino.');
        res.redirect('/');
    }
});

// --- PÁGINA DE CRIAÇÃO (Apenas Trainer) ---
router.get('/create', async (req, res) => {
    if (req.session.user.role !== 'trainer') return res.redirect('/');
    
    try {
        // Busca alunos do treinador para o select
        const clientsRes = await db.query(`
            SELECT c.id, u.name 
            FROM clients c 
            JOIN users u ON c.user_id = u.id 
            WHERE u.trainer_id = $1
        `, [req.session.user.id]);

        // Busca biblioteca de exercícios para o select
        const exercisesRes = await db.query('SELECT id, name, muscle_group FROM exercise_library ORDER BY name ASC');

        res.render('pages/create-workout', {
            clients: clientsRes.rows,
            exercises: exercisesRes.rows
        });
    } catch (err) {
        console.error(err);
        res.redirect('/trainer/dashboard');
    }
});

// --- PROCESSAR CRIAÇÃO (POST) ---
router.post('/create', async (req, res) => {
    if (req.session.user.role !== 'trainer') return res.status(403).send('Unauthorized');

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN'); // Início da Transação

        const { title, client_id, muscle_group, difficulty, description, exercises } = req.body;
        const trainerId = req.session.user.id;

        // 1. Criar o Treino
        const insertWorkoutText = `
            INSERT INTO workouts (client_id, trainer_id, title, description, muscle_group, difficulty, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            RETURNING id
        `;
        const workoutRes = await client.query(insertWorkoutText, [
            client_id, trainerId, title, description, muscle_group, difficulty
        ]);
        const workoutId = workoutRes.rows[0].id;

        // 2. Inserir Exercícios (se houver)
        if (exercises && Array.isArray(exercises)) {
            let orderIndex = 1;
            for (const ex of exercises) {
                if (ex.id) { // Só insere se tiver ID selecionado
                    const insertExText = `
                        INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight, notes, order_index)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `;
                    await client.query(insertExText, [
                        workoutId, ex.id, ex.sets, ex.reps, ex.weight, ex.notes, orderIndex++
                    ]);
                }
            }
        }

        await client.query('COMMIT'); // Confirma Transação
        req.flash('success', 'Treino criado com sucesso!');
        res.redirect('/trainer/dashboard');

    } catch (err) {
        await client.query('ROLLBACK'); // Desfaz se der erro
        console.error('Erro ao criar treino:', err);
        req.flash('error', 'Erro ao salvar treino. Tente novamente.');
        res.redirect('/workouts/create');
    } finally {
        client.release();
    }
});

// --- INICIAR TREINO (Ação do Cliente) ---
router.get('/:id/start', (req, res) => {
    // Placeholder para a tela de execução do treino
    res.redirect(`/workouts/${req.params.id}`);
});

module.exports = router;
