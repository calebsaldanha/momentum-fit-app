const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}

// Middleware: Carrega perfil do aluno e garante integridade
async function requireClientData(req, res, next) {
    try {
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1`;
        
        const { rows } = await db.query(clientQuery, [req.session.user.id]);
        const clientData = rows[0];

        if (!clientData || !clientData.id) {
             // Cria registro 'stub' se faltar
             await db.query("INSERT INTO clients (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.session.user.id]);
             return res.redirect('/client/initial-form');
        }

        res.locals.clientData = clientData;
        next();
    } catch (err) {
        console.error("Erro middleware client:", err);
        res.redirect('/auth/login');
    }
}

router.use(isAuthenticated);
router.use(requireClientData);

router.get('/dashboard', async (req, res) => {
    try {
        const clientId = res.locals.clientData.id;

        const workoutsRes = await db.query(`
            SELECT w.*, u.name as trainer_name 
            FROM workouts w 
            LEFT JOIN users u ON w.trainer_id = u.id 
            WHERE w.client_id = $1 
            ORDER BY w.created_at DESC LIMIT 3
        `, [clientId]);

        const checkinsRes = await db.query("SELECT COUNT(*) FROM checkins WHERE user_id = $1", [req.session.user.id]);
        const completedCount = parseInt(checkinsRes.rows[0].count);

        const streakRes = await db.query(`
            SELECT COUNT(DISTINCT DATE(created_at)) 
            FROM checkins 
            WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
        `, [req.session.user.id]);
        const streak = parseInt(streakRes.rows[0].count);

        res.render('pages/client-dashboard', { 
            title: 'Painel do Aluno', 
            user: req.session.user, 
            clientData: res.locals.clientData, 
            workouts: workoutsRes.rows,
            stats: { completed: completedCount, streak: streak },
            currentPage: 'dashboard',
            csrfToken: req.csrfToken()
        });
    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

router.get('/profile', (req, res) => {
    res.render('pages/client-profile', { 
        title: 'Meu Perfil', 
        user: req.session.user, 
        clientData: res.locals.clientData, 
        currentPage: 'profile', 
        csrfToken: req.csrfToken()
    });
});

router.post('/profile/update', async (req, res) => {
    // Redireciona para a rota principal de update (definida anteriormente)
    res.redirect('/client/profile'); 
});

router.get('/workouts', async (req, res) => {
    const workoutsRes = await db.query(`
        SELECT w.*, u.name as trainer_name 
        FROM workouts w 
        LEFT JOIN users u ON w.trainer_id = u.id 
        WHERE w.client_id = $1 
        ORDER BY w.created_at DESC`, 
        [res.locals.clientData.id]
    );
    
    res.render('pages/client-workouts', { 
        title: 'Meus Treinos', 
        user: req.session.user, 
        workouts: workoutsRes.rows, 
        currentPage: 'workouts',
        csrfToken: req.csrfToken() 
    });
});

router.get('/workouts/:id', async (req, res) => {
    try {
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1 AND client_id = $2", [req.params.id, res.locals.clientData.id]);
        if (workoutRes.rows.length === 0) return res.redirect('/client/workouts');
        
        const exercisesRes = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [req.params.id]);
        
        res.render('pages/workout-details', { 
            title: workoutRes.rows[0].title, 
            user: req.session.user, 
            workout: workoutRes.rows[0], 
            exercises: exercisesRes.rows, 
            currentPage: 'workouts',
            csrfToken: req.csrfToken()
        });
    } catch(e) { res.redirect('/client/workouts'); }
});

module.exports = router;
