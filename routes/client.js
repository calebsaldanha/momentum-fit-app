const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

// Middleware: Garante perfil
async function requireClientData(req, res, next) {
    try {
        let clientData = await db.getClientData(req.session.user.id);
        if (!clientData) clientData = await db.ensureClientProfile(req.session.user.id);
        res.locals.clientData = clientData;
        next();
    } catch (err) { res.redirect('/auth/login'); }
}

router.use(isAuthenticated);
router.use(requireClientData);

router.get('/dashboard', async (req, res) => {
    const workouts = await db.getClientWorkouts(res.locals.clientData.id, 3);
    const stats = await db.getClientStats(req.session.user.id);
    res.render('pages/client-dashboard', { 
        title: 'Dashboard', active: 'dashboard', workouts, stats 
    });
});

router.get('/workouts', async (req, res) => {
    const workouts = await db.getClientWorkouts(res.locals.clientData.id);
    res.render('pages/client-workouts', { title: 'Treinos', active: 'workouts', workouts });
});

router.get('/evolution', async (req, res) => {
    const history = await db.query("SELECT * FROM profile_history WHERE client_id = $1 ORDER BY recorded_at ASC", [res.locals.clientData.id]);
    res.render('pages/client-evolution', { title: 'Evolução', active: 'evolution', history: history.rows || [] });
});

router.get('/plans', (req, res) => res.render('pages/client-plans', { title: 'Plano', active: 'plans' }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach', { title: 'IA Coach', active: 'ai-coach' }));
router.get('/profile', (req, res) => res.render('pages/client-profile', { title: 'Perfil', active: 'profile' }));
router.get('/settings', (req, res) => res.render('pages/client-settings', { title: 'Configurações', active: 'settings' }));
router.get('/content', (req, res) => res.render('pages/client-content', { title: 'Conteúdo', active: 'content' }));

// Workout Play
router.get('/workout/:id', async (req, res) => {
    try {
        const workout = (await db.query("SELECT * FROM workouts WHERE id=$1", [req.params.id])).rows[0];
        const exercises = (await db.query("SELECT * FROM workout_exercises WHERE workout_id=$1 ORDER BY order_index", [req.params.id])).rows;
        if(!workout) return res.redirect('/client/workouts');
        
        res.render('pages/client-workout-play', { title: 'Treinar', active: 'workouts', workout, exercises });
    } catch(e) { res.redirect('/client/workouts'); }
});

module.exports = router;
