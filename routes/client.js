const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('client'));

// DASHBOARD
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user.id;
        
        let totalWorkouts = 0;
        try {
            const resH = await db.query('SELECT COUNT(*) FROM workout_history WHERE user_id = $1', [userId]);
            totalWorkouts = resH.rows[0].count;
        } catch(e) {}

        let nextWorkout = null;
        try {
            const resW = await db.query('SELECT * FROM workouts WHERE user_id = $1 OR is_public = true LIMIT 1', [userId]);
            if(resW.rows.length) nextWorkout = resW.rows[0];
        } catch(e) {}

        res.render('pages/client-dashboard', {
            user: req.user,
            stats: { plan_name: req.user.plan || 'Free', total_workouts: totalWorkouts, streak: 0 },
            nextWorkout,
            path: '/client/dashboard'
        });
    } catch (err) {
        res.render('pages/error', { message: 'Erro no Dashboard', user: req.user, path: '' });
    }
});

// WORKOUTS LIST
router.get('/workouts', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM workouts WHERE user_id = $1 OR is_public = true ORDER BY created_at DESC', [req.user.id]);
        res.render('pages/client-workouts', { user: req.user, workouts: result.rows, path: '/client/workouts' });
    } catch (err) {
        res.render('pages/client-workouts', { user: req.user, workouts: [], path: '/client/workouts' });
    }
});

// WORKOUT DETAILS (EXECUTION)
router.get('/workouts/:id', async (req, res) => {
    try {
        const wRes = await db.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
        if (!wRes.rows.length) return res.redirect('/client/workouts');
        const workout = wRes.rows[0];

        // Fetch Exercises
        try {
            const exRes = await db.query(`
                SELECT we.*, e.name, e.video_url 
                FROM workout_exercises we 
                JOIN exercises e ON we.exercise_id = e.id 
                WHERE we.workout_id = $1 
                ORDER BY we.order_index
            `, [req.params.id]);
            workout.exercises = exRes.rows;
        } catch(e) { workout.exercises = []; }

        res.render('pages/workout-details', { user: req.user, workout, path: '/client/workouts' });
    } catch (err) {
        res.redirect('/client/workouts');
    }
});

// AI COACH (SEM MOCK)
router.get('/ai-coach', async (req, res) => {
    // Futuro: Buscar do DB 'chat_messages'
    const messages = []; 
    res.render('pages/client-ai-coach', { user: req.user, messages, path: '/client/ai-coach' });
});

// PLANS (DADOS COPIADOS DA PÚBLICA NA VIEW)
router.get('/plans', (req, res) => {
    // A view agora contém os cards hardcoded iguais à home
    res.render('pages/client-plans', { user: req.user, path: '/client/plans' });
});

// PROFILE
router.get('/profile', (req, res) => {
    res.render('pages/client-profile', { user: req.user, anamnesis: req.user.anamnesis || {}, path: '/client/profile' });
});

// EVOLUTION
router.get('/evolution', (req, res) => {
    res.render('pages/client-evolution', { user: req.user, data: { weight: [], benchPress: [], labels: [] }, path: '/client/evolution' });
});

module.exports = router;
