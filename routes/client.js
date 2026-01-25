const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

const isClient = [ensureAuthenticated, ensureRole('client')];

// --- DASHBOARD ---
router.get('/dashboard', isClient, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Stats Básicos
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM workouts WHERE client_id = $1 AND is_active = true) as total_workouts,
                (SELECT name FROM plans WHERE id = (SELECT current_plan_id FROM users WHERE id = $1)) as plan_name
        `;
        const statsResult = await pool.query(statsQuery, [userId]);
        const stats = statsResult.rows[0] || { total_workouts: 0, plan_name: 'Gratuito' };

        // 2. Próximo Treino (O mais recente ativo)
        const workoutQuery = `
            SELECT w.id, w.name, w.description, count(we.id) as exercises_count
            FROM workouts w
            LEFT JOIN workout_exercises we ON w.id = we.workout_id
            WHERE w.client_id = $1 AND w.is_active = true
            GROUP BY w.id
            ORDER BY w.created_at DESC
            LIMIT 1
        `;
        const workoutResult = await pool.query(workoutQuery, [userId]);
        const nextWorkout = workoutResult.rows[0] || null;

        // 3. Treinador Vinculado
        const trainerQuery = `
            SELECT u.name, u.photo_url 
            FROM assignments a 
            JOIN users u ON a.trainer_id = u.id 
            WHERE a.client_id = $1 AND a.status = 'active'
        `;
        const trainerResult = await pool.query(trainerQuery, [userId]);
        const trainer = trainerResult.rows[0] || null;

        res.render('pages/client-dashboard', {
            user: req.user,
            stats,
            nextWorkout,
            trainer,
            title: 'Meu Painel',
            path: '/client/dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao carregar dashboard');
    }
});

// --- PERFIL DO CLIENTE (Dados Pessoais e Anamnese) ---
router.get('/profile', isClient, async (req, res) => {
    try {
        // Busca dados da tabela 'clients' (perfil estendido)
        const profileQuery = 'SELECT * FROM clients WHERE user_id = $1';
        const profileRes = await pool.query(profileQuery, [req.user.id]);
        
        res.render('pages/client-profile', { 
            user: req.user,
            profile: profileRes.rows[0] || {}, 
            title: 'Meu Perfil', 
            path: '/client/profile' 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

router.post('/profile', isClient, async (req, res) => {
    const { phone, birth_date, height, weight, objective, restrictions } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Atualiza tabela base users
        await client.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, req.user.id]);

        // Upsert na tabela clients
        const upsertQuery = `
            INSERT INTO clients (user_id, birth_date, height, weight, objective, restrictions, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                birth_date = EXCLUDED.birth_date,
                height = EXCLUDED.height,
                weight = EXCLUDED.weight,
                objective = EXCLUDED.objective,
                restrictions = EXCLUDED.restrictions,
                updated_at = NOW();
        `;
        await client.query(upsertQuery, [
            req.user.id, 
            birth_date || null, 
            parseFloat(height) || 0, 
            parseFloat(weight) || 0, 
            objective, 
            restrictions
        ]);

        await client.query('COMMIT');
        req.flash('success', 'Perfil atualizado com sucesso!');
        res.redirect('/client/profile');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro ao atualizar perfil.');
        res.redirect('/client/profile');
    } finally {
        client.release();
    }
});

// --- MEUS TREINOS ---
router.get('/workouts', isClient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT w.*, u.name as trainer_name 
            FROM workouts w
            LEFT JOIN users u ON w.creator_id = u.id
            WHERE w.client_id = $1 AND w.is_active = true
            ORDER BY w.created_at DESC
        `, [req.user.id]);

        res.render('pages/client-workouts', { 
            user: req.user, 
            workouts: result.rows,
            title: 'Meus Treinos', 
            path: '/client/workouts' 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao carregar treinos' });
    }
});

// Detalhes do Treino (Para execução)
router.get('/workouts/:id', isClient, async (req, res) => {
    try {
        const workoutId = req.params.id;
        
        // Buscar Header
        const wRes = await pool.query('SELECT * FROM workouts WHERE id = $1 AND client_id = $2', [workoutId, req.user.id]);
        if(wRes.rows.length === 0) return res.redirect('/client/workouts');

        // Buscar Exercícios
        const exRes = await pool.query(`
            SELECT we.*, e.name as exercise_name, e.video_url, e.muscle_group
            FROM workout_exercises we
            JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = $1
            ORDER BY we."order" ASC
        `, [workoutId]);

        res.render('pages/workout-details', {
            user: req.user,
            workout: wRes.rows[0],
            exercises: exRes.rows,
            title: wRes.rows[0].name,
            path: '/client/workouts'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/client/workouts');
    }
});

// --- EVOLUÇÃO (Placeholder com Query real futura) ---
router.get('/evolution', isClient, (req, res) => {
    // TODO: Buscar histórico de checkins ou peso
    res.render('pages/client-evolution', { user: req.user, title: 'Minha Evolução', path: '/client/evolution' });
});

// --- IA COACH ---
router.get('/ai-coach', isClient, (req, res) => {
    res.render('pages/client-ai-coach', { user: req.user, title: 'IA Coach', path: '/client/ai-coach' });
});

// --- PLANOS ---
router.get('/plans', isClient, async (req, res) => {
    const plans = await pool.query('SELECT * FROM plans WHERE is_active = true ORDER BY price ASC');
    res.render('pages/client-plans', { 
        user: req.user, 
        plans: plans.rows,
        title: 'Planos', 
        path: '/client/plans' 
    });
});

module.exports = router;
