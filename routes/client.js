const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClient);

router.get('/dashboard', async (req, res) => {
    try {
        // Busca perfil
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = profileRes.rows[0] || {};

        // Busca treinos com nome do treinador
        const workoutsRes = await pool.query(`
            SELECT w.*, u.name as trainer_name 
            FROM workouts w 
            LEFT JOIN users u ON w.trainer_id = u.id 
            WHERE w.client_id = $1 
            ORDER BY w.created_at DESC LIMIT 5`, 
            [req.session.user.id]
        );

        res.render('pages/client-dashboard', {
            title: 'Meu Painel',
            profile: profile, // View precisa desta variável
            workouts: workoutsRes.rows, // View precisa desta variável
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar painel.' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = profileRes.rows[0] || {};
        
        // Calcula IMC
        let imc = '--';
        if (profile.weight && profile.height) {
            const h = parseFloat(profile.height);
            const w = parseFloat(profile.weight.toString().replace(',', '.'));
            if (h > 0) imc = (w / (h * h)).toFixed(1);
        }

        res.render('pages/client-profile', {
            title: 'Meu Perfil',
            profile: profile,
            imc: imc,
            currentPage: 'profile'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar perfil.' });
    }
});

// Update Profile
router.post('/profile', async (req, res) => {
    // ... Lógica de update simplificada para focar na correção de carregamento ...
    const { name, phone, age, weight, height, main_goal } = req.body;
    try {
        await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, req.session.user.id]);
        await pool.query(`
            INSERT INTO client_profiles (user_id, phone, age, weight, height, main_goal)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) DO UPDATE SET
            phone = EXCLUDED.phone, age = EXCLUDED.age, weight = EXCLUDED.weight, 
            height = EXCLUDED.height, main_goal = EXCLUDED.main_goal`,
            [req.session.user.id, phone, age, weight, height, main_goal]
        );
        req.flash('success', 'Perfil atualizado!');
        res.redirect('/client/profile');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao atualizar.');
        res.redirect('/client/profile');
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const workouts = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', {
            title: 'Meus Treinos',
            workouts: workouts.rows,
            currentPage: 'workouts'
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro.' }); }
});

router.get('/initial-form', (req, res) => {
    // Verifica se já tem perfil, se tiver redireciona
    res.render('pages/initial-form', { title: 'Avaliação', profile: {}, currentPage: 'profile' });
});

router.post('/initial-form', async (req, res) => {
     // Lógica similar ao profile update mas redireciona para dashboard
     const { weight, height, main_goal } = req.body;
     try {
         await pool.query(
            "INSERT INTO client_profiles (user_id, weight, height, main_goal) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING",
            [req.session.user.id, weight, height, main_goal]
         );
         await pool.query("UPDATE users SET status = 'pending_approval' WHERE id = $1", [req.session.user.id]);
         res.redirect('/client/dashboard');
     } catch(e) { console.error(e); res.redirect('/client/initial-form'); }
});

module.exports = router;
