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

const trainerRouter = express.Router();
trainerRouter.use(requireTrainerAuth);

// --- ROTAS DO TREINADOR (Create, Edit, Delete) ---

// 1. Tela de Criar
trainerRouter.get('/create', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const query = req.session.user.role === 'superadmin' 
            ? "SELECT id, name FROM users WHERE role = 'client' AND status = 'active' ORDER BY name"
            : `SELECT u.id, u.name FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE cp.assigned_trainer_id = $1 AND u.status = 'active' ORDER BY u.name`;
        
        const clients = await pool.query(query, req.session.user.role === 'superadmin' ? [] : [userId]);
        const library = await pool.query("SELECT * FROM exercise_library ORDER BY name ASC");

        res.render('pages/create-workout', { 
            title: 'Novo Treino', 
            clients: clients.rows, 
            exerciseLibrary: library.rows,
            selectedClientId: req.query.client_id || '', 
            user: req.session.user, 
            currentPage: 'create-workout' 
        });
    } catch (err) { console.error(err); res.status(500).render('pages/error', { message: 'Erro ao carregar.' }); }
});

// 2. Salvar Treino
trainerRouter.post('/create', async (req, res) => {
    const { client_id, title, description, exercises } = req.body;
    if (!client_id || !title || !exercises) return res.status(400).json({ success: false, message: 'Dados inválidos.' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const wRes = await client.query(
            "INSERT INTO workouts (client_id, trainer_id, title, description, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id", 
            [client_id, req.session.user.id, title, description||'']
        );
        const wid = wRes.rows[0].id;
        
        for (const ex of exercises) {
            await client.query(
                "INSERT INTO workout_exercises (workout_id, name, sets, reps, notes, order_index, video_url, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
                [wid, ex.name, ex.sets, ex.reps, ex.notes||'', ex.order_index, ex.video_url||null, ex.image_url||null]
            );
        }
        await client.query('COMMIT');
        
        const tRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.session.user.id]);
        await notificationService.notifyNewWorkout(title, client_id, wid, tRes.rows[0]?.name || 'Treinador');
        
        res.json({ success: true, clientId: client_id });
    } catch (e) { 
        await client.query('ROLLBACK'); 
        console.error(e); 
        res.status(500).json({ success: false, message: 'Erro ao salvar.' }); 
    } finally { client.release(); }
});

// 3. Excluir e Editar (Simplificados para focar no erro principal)
trainerRouter.post('/delete/:id', async (req, res) => {
    try {
        const w = await pool.query("SELECT client_id FROM workouts WHERE id = $1", [req.params.id]);
        if (w.rows.length === 0) return res.status(404).render('pages/error', { message: 'Não encontrado.' });
        await pool.query("DELETE FROM workout_exercises WHERE workout_id = $1", [req.params.id]);
        await pool.query("DELETE FROM workouts WHERE id = $1", [req.params.id]);
        res.redirect('/admin/clients/' + w.rows[0].client_id);
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao excluir.' }); }
});

router.use('/', trainerRouter);

// --- ROTA DE VISUALIZAÇÃO (Onde estava o erro) ---
router.get('/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    try {
        const workoutId = req.params.id;
        if (workoutId === 'create') return res.redirect('/workouts/create');

        console.log(`�� Carregando treino ${workoutId} para usuário ${req.session.user.id}`);

        // 1. Busca Treino Básico
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).render('pages/error', { message: 'Treino não encontrado.' });

        // 2. Busca Perfil (Se for aluno) para não quebrar a Sidebar
        let profile = {};
        if (req.session.user.role === 'client') {
            const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
            profile = profileRes.rows[0] || {};
        }

        // 3. Busca Exercícios com Detalhes (JOIN Seguro)
        // Usa nomes explícitos de colunas para evitar ambiguidade
        const exercisesQuery = `
            SELECT 
                we.id, we.workout_id, we.name, we.sets, we.reps, we.notes, we.order_index, 
                we.video_url, -- Garanta que esta coluna existe no banco (rodar script fix_schema_final.js)
                COALESCE(we.image_url, el.image_url) as image_url,
                el.description,
                el.execution_instructions,
                el.tips,
                el.recommendations
            FROM workout_exercises we
            LEFT JOIN exercise_library el ON LOWER(TRIM(we.name)) = LOWER(TRIM(el.name))
            WHERE we.workout_id = $1 
            ORDER BY we.order_index ASC
        `;

        const exercisesRes = await pool.query(exercisesQuery, [workoutId]);
        console.log(`✅ Treino carregado com ${exercisesRes.rows.length} exercícios.`);

        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            user: req.session.user,
            profile: profile, // CRÍTICO para client-sidebar
            currentPage: 'workouts'
        });

    } catch(e) { 
        console.error("❌ ERRO CRÍTICO NA ROTA DE TREINO:", e); 
        res.status(500).render('pages/error', { message: 'Erro interno ao carregar o treino. Verifique os logs.' }); 
    }
});

module.exports = router;
