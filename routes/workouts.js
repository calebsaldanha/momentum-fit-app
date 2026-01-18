const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware de autenticação
router.use((req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
});

// GET: Detalhes do Treino
router.get('/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // 1. Dados do Treino
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: "Treino não encontrado" });
        const workout = workoutRes.rows[0];

        // 2. Exercícios do Treino (Atuais)
        const currentExercises = await db.query(`
            SELECT we.*, el.name, el.video_url, el.muscle_group 
            FROM workout_exercises we
            LEFT JOIN exercise_library el ON we.exercise_id = el.id
            WHERE we.workout_id = $1
            ORDER BY we.order_index ASC
        `, [workoutId]);

        // 3. Biblioteca Completa (Para o Admin adicionar novos)
        // Isso "resgata" os exercícios que estão no banco (com links do Blob)
        let library = [];
        if (req.session.user.role !== 'client') {
            const libRes = await db.query("SELECT * FROM exercise_library ORDER BY name ASC");
            library = libRes.rows;
        }

        res.render('pages/workout-details', { 
            workout, 
            exercises: currentExercises.rows,
            library // Passa a biblioteca para a view
        });

    } catch (err) {
        console.error("Erro Workouts:", err);
        res.status(500).render('pages/error', { message: "Erro ao carregar treino." });
    }
});

// POST: Atualizar Cabeçalho do Treino
router.post('/:id/update', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    
    const { title, description, day_of_week } = req.body;
    await db.query("UPDATE workouts SET title=$1, description=$2, day_of_week=$3 WHERE id=$4", 
        [title, description, day_of_week, req.params.id]);
    
    req.flash('success', 'Treino atualizado.');
    res.redirect(`/workouts/${req.params.id}`);
});

// POST: Adicionar Exercício da Biblioteca
router.post('/:id/add-exercise', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');

    const { exercise_id, sets, reps, load } = req.body;
    
    // Pega o maior order_index atual
    const maxOrder = await db.query("SELECT MAX(order_index) as max FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
    const nextOrder = (maxOrder.rows[0].max || 0) + 1;

    await db.query(`
        INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, load, order_index)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.params.id, exercise_id, sets, reps, load || '0', nextOrder]);

    req.flash('success', 'Exercício adicionado.');
    res.redirect(`/workouts/${req.params.id}`);
});

// POST: Remover Exercício
router.post('/:id/remove-exercise/:weId', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    
    await db.query("DELETE FROM workout_exercises WHERE id = $1", [req.params.weId]);
    req.flash('success', 'Exercício removido.');
    res.redirect(`/workouts/${req.params.id}`);
});

// POST: Atualizar Carga/Reps de um exercício específico
router.post('/:id/update-exercise/:weId', async (req, res) => {
    if (req.session.user.role === 'client') return res.status(403).send('Acesso negado');
    
    const { sets, reps, load } = req.body;
    await db.query("UPDATE workout_exercises SET sets=$1, reps=$2, load=$3 WHERE id=$4", 
        [sets, reps, load, req.params.weId]);
    
    req.flash('success', 'Cargas atualizadas.');
    res.redirect(`/workouts/${req.params.id}`);
});

module.exports = router;
