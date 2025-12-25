const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClientAuth);

router.get('/dashboard', async (req, res) => {
    // Limpa notificação de boas-vindas/aprovação
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND link = '/client/dashboard'", [req.session.user.id]);
    
    // ... Lógica do Dashboard ...
    try {
        const cpRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        if(cpRes.rows.length === 0) return res.redirect('/client/initial-form');
        
        // Treinos recentes
        const wRes = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 3", [req.session.user.id]);
        
        res.render('pages/client-dashboard', {
            title: 'Dashboard',
            user: req.session.user,
            profile: cpRes.rows[0],
            recentWorkouts: wRes.rows,
            currentPage: 'dashboard'
        });
    } catch(e) { console.error(e); res.render('pages/error', { message: 'Erro dash.' }); }
});

router.get('/workouts', async (req, res) => {
    try {
        // --- NOVO: Limpa notificações genéricas de treinos ao ver a lista ---
        await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND link = '/client/workouts'", [req.session.user.id]);

        const wRes = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', {
            title: 'Meus Treinos',
            user: req.session.user,
            workouts: wRes.rows,
            currentPage: 'workouts'
        });
    } catch(e) { res.render('pages/error', { message: 'Erro treinos.' }); }
});

router.get('/initial-form', (req, res) => {
    res.render('pages/initial-form', { title: 'Anamnese', user: req.session.user, csrfToken: res.locals.csrfToken });
});

router.post('/initial-form', async (req, res) => {
    // ... lógica original de salvar form ...
    const { phone, birthdate, weight, height, goal, restrictions, experience_level } = req.body;
    try {
        await pool.query(
            `INSERT INTO client_profiles (user_id, phone, birthdate, weight, height, goal, restrictions, experience_level)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (user_id) DO UPDATE 
             SET phone=$2, birthdate=$3, weight=$4, height=$5, goal=$6, restrictions=$7, experience_level=$8`,
            [req.session.user.id, phone, birthdate, weight, height, goal, restrictions, experience_level]
        );
        res.redirect('/client/dashboard');
    } catch(e) { console.error(e); res.status(500).send('Erro ao salvar.'); }
});

router.get('/profile', async (req, res) => {
    try {
        const pRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/client-profile', {
            title: 'Perfil',
            user: req.session.user,
            profile: pRes.rows[0],
            currentPage: 'profile'
        });
    } catch(e) { res.status(500).send('Erro.'); }
});

module.exports = router;
