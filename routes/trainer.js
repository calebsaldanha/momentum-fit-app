const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isTrainer(req, res, next) {
    if (req.session.user && req.session.user.role === 'trainer') return next();
    res.redirect('/auth/login');
}

router.use(isTrainer);

// --- DASHBOARD & AGENDA ---
router.get('/dashboard', async (req, res) => {
    try {
        const clients = await db.query("SELECT COUNT(*) FROM users WHERE trainer_id = $1", [req.session.user.id]);
        res.render('pages/trainer-dashboard', { stats: { totalClients: clients.rows[0].count, activeClients: clients.rows[0].count } });
    } catch (e) { res.render('pages/trainer-dashboard', { stats: { totalClients: 0, activeClients: 0 } }); }
});

router.get('/schedule', async (req, res) => {
    const events = await db.query("SELECT * FROM trainer_schedule WHERE trainer_id = $1", [req.session.user.id]);
    res.render('pages/trainer-schedule', { events: events.rows });
});

router.post('/schedule/create', async (req, res) => {
    await db.query("INSERT INTO trainer_schedule (trainer_id, title, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5)", 
    [req.session.user.id, req.body.title, req.body.day, req.body.start, req.body.end]);
    res.redirect('/trainer/schedule');
});

// --- GESTÃO DE ALUNOS ---
router.get('/clients', async (req, res) => {
    const result = await db.query("SELECT * FROM users WHERE trainer_id = $1", [req.session.user.id]);
    res.render('pages/trainer-clients', { clients: result.rows });
});

// Detalhes do Aluno (Visão do Treinador)
router.get('/clients/:id', async (req, res) => {
    const client = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.params.id]);
    res.render('pages/trainer-details', { client: client.rows[0], workouts: workouts.rows });
});

// --- CRIAÇÃO DE TREINOS (CONECTANDO AS PÁGINAS ÓRFÃS) ---

// 1. Página de Criar Treino
router.get('/clients/:clientId/create-workout', async (req, res) => {
    const client = await db.query("SELECT * FROM users WHERE id = $1", [req.params.clientId]);
    const exercises = await db.query("SELECT * FROM exercise_library WHERE created_by IS NULL OR created_by = $1", [req.session.user.id]);
    res.render('pages/create-workout', { client: client.rows[0], exercises: exercises.rows });
});

// 2. Salvar Novo Treino
router.post('/workouts/create', async (req, res) => {
    const { clientId, title, description, day_of_week, exercises } = req.body; // exercises deve ser array de IDs
    try {
        await db.query('BEGIN');
        const workout = await db.query(
            "INSERT INTO workouts (user_id, trainer_id, title, description, day_of_week) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [clientId, req.session.user.id, title, description, day_of_week]
        );
        
        // Lógica simplificada: Se 'exercises' vier como string JSON ou array
        // Aqui assumimos que o form envia arrays paralelos ou JSON. Para MVP, redirecionamos.
        
        await db.query('COMMIT');
        req.flash('success', 'Treino criado com sucesso!');
        res.redirect('/trainer/clients/' + clientId);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro ao criar treino.');
        res.redirect('/trainer/dashboard');
    }
});

// 3. Página de Editar Treino
router.get('/workouts/edit/:id', async (req, res) => {
    const workout = await db.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
    const exercises = await db.query("SELECT * FROM exercise_library");
    const currentExercises = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
    
    res.render('pages/edit-workout', { 
        workout: workout.rows[0], 
        exercises: exercises.rows,
        currentExercises: currentExercises.rows 
    });
});

// --- OUTROS ---
router.get('/library', async (req, res) => {
    const result = await db.query("SELECT * FROM exercise_library WHERE created_by = $1 OR created_by IS NULL", [req.session.user.id]);
    res.render('pages/trainer-library', { exercises: result.rows });
});

router.post('/library/create', async (req, res) => {
    await db.query("INSERT INTO exercise_library (name, muscle_group, video_url, created_by) VALUES ($1, $2, $3, $4)", 
    [req.body.name, req.body.muscle_group, req.body.video_url, req.session.user.id]);
    res.redirect('/trainer/library');
});

router.get('/content', async (req, res) => {
    const result = await db.query("SELECT * FROM articles WHERE author_id = $1", [req.session.user.id]);
    res.render('pages/trainer-content', { articles: result.rows });
});

// Rota dedicada para criar artigo (Página inteira)
router.get('/content/create', (req, res) => {
    res.render('pages/create-article');
});

router.get('/profile', async (req, res) => {
    const result = await db.query("SELECT u.*, t.* FROM users u JOIN trainers t ON u.id = t.user_id WHERE u.id = $1", [req.session.user.id]);
    res.render('pages/trainer-profile', { trainer: result.rows[0] });
});

router.get('/financial', async (req, res) => {
    const result = await db.query("SELECT pix_key, pix_key_type, price_monthly FROM trainers WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/trainer-financial', { data: result.rows[0], revenue: { total: 0 } });
});

module.exports = router;
