const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const db = require('../database/db');

router.use(ensureAuthenticated);
router.use(ensureRole('client'));

// ... (Outras rotas Dashboard, Workouts mantidas iguais) ...

// DASHBOARD
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user.id;
        // Mock rápido para não quebrar se tabelas faltarem
        const stats = { plan_name: req.user.plan || 'Free', total_workouts: 0, streak: 0 };
        res.render('pages/client-dashboard', {
            user: req.user, stats, nextWorkout: null, path: '/client/dashboard'
        });
    } catch (err) { res.render('pages/error', { user: req.user, message: 'Erro dash', path: '' }); }
});

router.get('/workouts', (req, res) => res.render('pages/client-workouts', { user: req.user, workouts: [], path: '/client/workouts' }));

router.get('/workouts/:id', async (req, res) => {
    // Simulação para preview de UI
    const workout = { id: 1, name: 'Treino A - Superiores', exercises: [
        { id: 1, name: 'Supino Reto', sets: 4, reps: '8-10', video_url: '#' },
        { id: 2, name: 'Puxada Alta', sets: 4, reps: '10-12', video_url: '#' }
    ]};
    res.render('pages/workout-details', { user: req.user, workout, path: '/client/workouts' });
});

router.get('/plans', (req, res) => res.render('pages/client-plans', { user: req.user, path: '/client/plans' }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach', { user: req.user, messages: [], path: '/client/ai-coach' }));
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { user: req.user, data: {weight:[], labels:[]}, path: '/client/evolution' }));

// --- PROFILE GET ---
router.get('/profile', async (req, res) => {
    let anamnesis = {};
    
    // Tenta carregar do JSONB do banco
    if (req.user.anamnesis) {
        anamnesis = req.user.anamnesis;
    } 
    // Fallback: Tenta query fresca caso a session esteja velha
    try {
        const result = await db.query('SELECT name, phone, anamnesis FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length > 0) {
            req.user.name = result.rows[0].name;
            req.user.phone = result.rows[0].phone;
            anamnesis = result.rows[0].anamnesis || {};
        }
    } catch (e) { console.error(e); }

    res.render('pages/client-profile', { 
        user: req.user, 
        anamnesis, 
        path: '/client/profile' 
    });
});

// --- PROFILE POST (UPDATE COMPLETO) ---
router.post('/profile/update', async (req, res) => {
    try {
        const { name, phone, anamnesis } = req.body;
        const userId = req.user.id;

        // Atualiza Nome, Telefone e o objeto JSON inteiro da Anamnese
        await db.query(
            'UPDATE users SET name = $1, phone = $2, anamnesis = $3 WHERE id = $4',
            [name, phone, anamnesis, userId]
        );

        // Atualiza sessão local (hack para refletir sem relogin)
        req.user.name = name;
        req.user.phone = phone;
        req.user.anamnesis = anamnesis;

        req.flash('success_msg', 'Perfil e Ficha de Anamnese atualizados!');
        res.redirect('/client/profile');
    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
        req.flash('error_msg', 'Erro ao salvar os dados.');
        res.redirect('/client/profile');
    }
});

module.exports = router;
