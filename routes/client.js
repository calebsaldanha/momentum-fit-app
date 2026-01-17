const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

// Middleware para garantir perfil de cliente
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
    res.render('pages/client-dashboard', { title: 'Dashboard', workouts, stats });
});

router.get('/workouts', async (req, res) => {
    const workouts = await db.getClientWorkouts(res.locals.clientData.id);
    res.render('pages/client-workouts', { title: 'Treinos', workouts });
});

router.get('/evolution', async (req, res) => {
    const history = await db.query("SELECT * FROM profile_history WHERE client_id = $1 ORDER BY recorded_at ASC", [res.locals.clientData.id]);
    res.render('pages/client-evolution', { title: 'Minha Evolução', history: history.rows });
});

// Rotas Faltantes
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach', { title: 'IA Coach' }));
router.get('/plans', (req, res) => res.render('pages/client-plans', { title: 'Meu Plano' }));
router.get('/content', (req, res) => res.render('pages/client-content', { title: 'Conteúdos Salvos' }));
router.get('/settings', (req, res) => res.render('pages/client-settings', { title: 'Configurações' }));
router.get('/profile', (req, res) => res.render('pages/client-profile', { title: 'Perfil' }));

// Modo Play (Correção de link)
router.get('/workout/:id', async (req, res) => {
    const workout = await db.query("SELECT * FROM workouts WHERE id = $1", [req.params.id]);
    const exercises = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index", [req.params.id]);
    if(workout.rows.length === 0) return res.redirect('/client/workouts');
    
    res.render('pages/client-workout-play', { 
        title: workout.rows[0].title, 
        workout: workout.rows[0], 
        exercises: exercises.rows 
    });
});

module.exports = router;
