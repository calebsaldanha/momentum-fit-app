const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('client'));

// --- DASHBOARD COM DADOS REAIS ---
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Contagem de treinos realizados (Simulado ou Real se tiver tabela history)
        // Se não tiver tabela de histórico, usamos uma dummy query
        const historyQuery = `
            SELECT COUNT(*) as total 
            FROM (SELECT 1) AS dummy 
            WHERE 1=0 -- Placeholder para evitar erro se tabela não existir
        `;
        // Tente executar query real se as tabelas existirem
        let totalWorkouts = 0;
        try {
            const resHistory = await db.query('SELECT COUNT(*) as total FROM workout_history WHERE user_id = $1', [userId]);
            totalWorkouts = resHistory.rows[0].total;
        } catch (e) { totalWorkouts = 0; } // Fallback silencioso

        // 2. Próximo Treino (Busca um treino atribuído)
        let nextWorkout = null;
        try {
            const resWorkouts = await db.query('SELECT * FROM workouts WHERE user_id = $1 OR is_public = true LIMIT 1', [userId]);
            if (resWorkouts.rows.length > 0) {
                nextWorkout = resWorkouts.rows[0];
            }
        } catch (e) { console.error("Erro ao buscar treinos:", e.message); }

        // 3. Stats Gerais
        const stats = {
            plan_name: req.user.plan || 'Free',
            total_workouts: totalWorkouts,
            streak: 0
        };

        res.render('pages/client-dashboard', {
            user: req.user,
            stats,
            nextWorkout,
            trainer: null, // Pode ser preenchido se tiver tabela de associação
            path: '/client/dashboard'
        });

    } catch (err) {
        console.error("Dashboard Fatal Error:", err);
        res.status(500).render('pages/error', { message: 'Erro crítico no painel.', user: req.user, path: '' });
    }
});

// --- LISTA DE TREINOS DO BANCO ---
router.get('/workouts', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM workouts 
            WHERE user_id = $1 OR is_public = true 
            ORDER BY created_at DESC
        `, [req.user.id]);

        res.render('pages/client-workouts', {
            user: req.user,
            workouts: result.rows,
            path: '/client/workouts'
        });
    } catch (err) {
        console.error(err);
        res.render('pages/client-workouts', { user: req.user, workouts: [], path: '/client/workouts' });
    }
});

// --- DETALHE DO TREINO ---
router.get('/workouts/:id', async (req, res) => {
    try {
        // Busca Treino
        const wResult = await db.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
        if (wResult.rows.length === 0) return res.redirect('/client/workouts');
        const workout = wResult.rows[0];

        // Busca Exercícios (Se a tabela existir)
        let exercises = [];
        try {
            const exResult = await db.query(`
                SELECT we.*, e.name, e.video_url 
                FROM workout_exercises we 
                JOIN exercises e ON we.exercise_id = e.id 
                WHERE we.workout_id = $1 
                ORDER BY we.order_index
            `, [req.params.id]);
            exercises = exResult.rows;
        } catch (e) {
            // Fallback se não tiver exercícios vinculados no banco ainda
            exercises = [
                { name: 'Exercício Exemplo (Dados pendentes)', sets: 3, reps: '10', rpe: 8 }
            ];
        }

        workout.exercises = exercises;

        res.render('pages/workout-details', {
            user: req.user,
            workout,
            path: '/client/workouts'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/client/workouts');
    }
});

router.get('/evolution', (req, res) => {
    // Dados de evolução ainda podem ser mockados se não houver tabela de métricas
    res.render('pages/client-evolution', {
        user: req.user,
        data: { labels: ['Jan', 'Fev'], weight: [70, 71], benchPress: [50, 55] },
        path: '/client/evolution'
    });
});

router.get('/plans', (req, res) => {
    res.render('pages/client-plans', {
        user: req.user,
        plan: { name: req.user.plan || 'Free', price: '0,00', features: ['Básico'] },
        path: '/client/plans'
    });
});

router.get('/ai-coach', (req, res) => {
    res.render('pages/client-ai-coach', { user: req.user, messages: [], path: '/client/ai-coach' });
});

router.get('/profile', (req, res) => {
    const anamnesis = req.user.anamnesis || {};
    res.render('pages/client-profile', { user: req.user, anamnesis, path: '/client/profile' });
});

router.post('/profile/update', async (req, res) => {
    // Atualizar no banco
    try {
        const { name, phone } = req.body;
        await db.query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone, req.user.id]);
        req.flash('success_msg', 'Perfil atualizado.');
    } catch (e) {
        req.flash('error_msg', 'Erro ao atualizar.');
    }
    res.redirect('/client/profile');
});

module.exports = router;
