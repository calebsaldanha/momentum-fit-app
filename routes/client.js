const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('client'));

// --- DASHBOARD ---
router.get('/dashboard', async (req, res) => {
    try {
        // Dados de Fallback (Mock) caso DB falhe
        const stats = { plan_name: req.user.plan || 'Free', total_workouts: 12, streak: 3 };
        const nextWorkout = { id: 1, name: 'Upper Body Power', description: 'Foco em força.', exercises_count: 6 };
        const trainer = null; // null aciona a IA na view

        res.render('pages/client-dashboard', {
            user: req.user,
            stats,
            nextWorkout,
            trainer,
            path: '/client/dashboard'
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard', user: req.user, path: '' });
    }
});

// --- EVOLUTION (Novo) ---
router.get('/evolution', (req, res) => {
    // Dados simulados de evolução de peso/carga
    const evolutionData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
        weight: [80, 79, 78.5, 77, 76],
        benchPress: [60, 65, 70, 75, 80]
    };
    
    res.render('pages/client-evolution', {
        user: req.user,
        data: evolutionData,
        path: '/client/evolution'
    });
});

// --- PLANS (Novo) ---
router.get('/plans', (req, res) => {
    const currentPlan = {
        name: req.user.plan || 'Free',
        price: '0,00',
        features: ['Acesso Básico', 'Publicidade', 'Sem Coach Humano']
    };

    res.render('pages/client-plans', {
        user: req.user,
        plan: currentPlan,
        path: '/client/plans'
    });
});

// --- WORKOUTS ---
router.get('/workouts', (req, res) => {
    const workouts = [
        { id: 1, name: 'Leg Day Insano', category: 'Pernas', duration: '60 min', difficulty: 'Hard' },
        { id: 2, name: 'Push A', category: 'Superiores', duration: '45 min', difficulty: 'Medium' }
    ];
    res.render('pages/client-workouts', { user: req.user, workouts, path: '/client/workouts' });
});

router.get('/workouts/:id', (req, res) => {
    // Simula busca no DB
    const workout = {
        id: req.params.id,
        name: 'Leg Day Insano',
        description: 'Foco total em quadríceps hoje.',
        exercises: [
            { id: 1, name: 'Agachamento Livre', sets: 4, reps: '8-10', rpe: 9, video_url: '#' },
            { id: 2, name: 'Leg Press 45', sets: 3, reps: '12-15', rpe: 9, video_url: '#' }
        ]
    };
    res.render('pages/workout-details', { user: req.user, workout, path: '/client/workouts' });
});

// --- PROFILE / ANAMNESIS ---
router.get('/profile', async (req, res) => {
    // Tenta buscar anamnese, se não existir, objeto vazio
    const anamnesis = req.user.anamnesis || {
        injury: false,
        medication: false,
        objective: 'Hipertrofia',
        experience: 'Iniciante'
    };

    res.render('pages/client-profile', { 
        user: req.user, 
        anamnesis,
        path: '/client/profile' 
    });
});

// Post para salvar Anamnese
router.post('/profile/update', async (req, res) => {
    // TODO: Implementar Update no DB
    req.flash('success_msg', 'Perfil atualizado com sucesso (Simulação).');
    res.redirect('/client/profile');
});

// --- AI COACH ---
router.get('/ai-coach', (req, res) => {
    const messages = [
        { sender: 'ai', text: 'Olá! Sou sua IA. Como foi o treino de ontem?', time: '08:00' }
    ];
    res.render('pages/client-ai-coach', { user: req.user, messages, path: '/client/ai-coach' });
});

module.exports = router;
