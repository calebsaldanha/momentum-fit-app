const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middleware/auth');

router.use(ensureAuthenticated);
router.use(checkRole('client'));

// --- DASHBOARD & LISTAGENS ---
router.get('/dashboard', (req, res) => {
    // Mock Data
    const stats = { plan_name: req.user.plan || 'Free', total_workouts: 12 };
    const nextWorkout = { id: 1, name: 'Upper Body Power', description: 'Foco em força.', exercises_count: 6 };
    const trainer = null;
    res.render('pages/client-dashboard', { user: req.user, stats, nextWorkout, trainer, path: '/client/dashboard' });
});

router.get('/workouts', (req, res) => {
    const workouts = [
        { id: 1, name: 'Leg Day Insano', category: 'Pernas', duration: '60 min', difficulty: 'Hard' },
        { id: 2, name: 'Push A', category: 'Superiores', duration: '45 min', difficulty: 'Medium' }
    ];
    res.render('pages/client-workouts', { user: req.user, workouts, path: '/client/workouts' });
});

// --- NOVAS ROTAS DE AÇÃO (FASE 2) ---

// Detalhes/Execução do Treino
router.get('/workouts/:id', (req, res) => {
    const workout = {
        id: req.params.id,
        name: 'Leg Day Insano',
        description: 'Foco total em quadríceps hoje. Mantenha a intensidade.',
        exercises: [
            { id: 1, name: 'Agachamento Livre', sets: 4, reps: '8-10', rpe: 9, video_url: '#' },
            { id: 2, name: 'Leg Press 45', sets: 3, reps: '12-15', rpe: 9, video_url: '#' },
            { id: 3, name: 'Cadeira Extensora', sets: 3, reps: '15-20', rpe: 10, video_url: '#' }
        ]
    };
    res.render('pages/workout-details', { user: req.user, workout, path: '/client/workouts' });
});

// AI Coach Chat
router.get('/ai-coach', (req, res) => {
    const messages = [
        { sender: 'ai', text: 'Olá! Sou sua IA de performance. Como posso ajustar seu treino hoje?', time: '08:00' },
        { sender: 'user', text: 'Estou sentindo dor no ombro.', time: '08:05' }
    ];
    res.render('pages/client-ai-coach', { user: req.user, messages, path: '/client/ai-coach' });
});

// Perfil
router.get('/profile', (req, res) => {
    res.render('pages/client-profile', { user: req.user, path: '/client/profile' });
});

module.exports = router;
