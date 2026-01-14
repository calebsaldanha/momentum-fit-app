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
        // Usa a nova função do DB.js que já trata o INSERT ON CONFLICT se necessário
        let clientData = await db.getClientData(req.session.user.id);
        
        if (!clientData || !clientData.id) {
             clientData = await db.ensureClientProfile(req.session.user.id);
             // Se acabou de criar, pode redirecionar para form inicial
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
        
        // Buscando dados via funções abstratas do DB
        const recentWorkouts = await db.getClientWorkouts(clientId, 3);
        const stats = await db.getClientStats(req.session.user.id);

        res.render('pages/client-dashboard', { 
            title: 'Painel do Aluno', 
            user: req.session.user, 
            clientData: res.locals.clientData, 
            workouts: recentWorkouts,
            stats: stats,
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
    res.redirect('/client/profile'); 
});

router.get('/workouts', async (req, res) => {
    try {
        const workouts = await db.getClientWorkouts(res.locals.clientData.id);
        res.render('pages/client-workouts', { 
            title: 'Meus Treinos', 
            user: req.session.user, 
            workouts: workouts, 
            currentPage: 'workouts',
            csrfToken: req.csrfToken() 
        });
    } catch (e) {
        console.error(e);
        res.redirect('/client/dashboard');
    }
});

router.get('/workouts/:id', async (req, res) => {
    try {
        const workoutData = await db.getWorkoutDetails(req.params.id, res.locals.clientData.id);
        
        if (!workoutData) return res.redirect('/client/workouts');
        
        res.render('pages/workout-details', { 
            title: workoutData.title, 
            user: req.session.user, 
            workout: workoutData, 
            exercises: workoutData.exercises, 
            currentPage: 'workouts',
            csrfToken: req.csrfToken()
        });
    } catch(e) { 
        console.error(e);
        res.redirect('/client/workouts'); 
    }
});

module.exports = router;
