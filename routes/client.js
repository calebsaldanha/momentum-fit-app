const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClientAuth);

// --- Rota do Formulário Inicial (Obrigatório para novos usuários) ---
router.get('/initial-form', async (req, res) => {
    // Verifica se já tem perfil para evitar acesso desnecessário
    const check = await pool.query("SELECT 1 FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
    if (check.rows.length > 0) return res.redirect('/client/dashboard');

    res.render('pages/initial-form', { title: 'Complete seu Perfil - Momentum Fit' });
});

router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    const { age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment } = req.body;

    try {
        await pool.query(
            `INSERT INTO client_profiles 
            (user_id, age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment]
        );
        res.redirect('/client/dashboard');
    } catch (err) {
        console.error("Erro no formulário inicial:", err);
        res.status(500).render('pages/error', { message: 'Erro ao salvar perfil.' });
    }
});

// --- Rotas Padrão ---

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Verifica perfil
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [userId]);
        if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');

        const workoutsRes = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC",
            [userId]
        );

        const checkinsRes = await pool.query(
            "SELECT created_at::date as date, COUNT(*) as count FROM workout_checkins WHERE client_id = $1 GROUP BY date ORDER BY date ASC LIMIT 7",
            [userId]
        );

        res.render('pages/client-dashboard', {
            title: 'Painel Geral - Momentum Fit',
            workouts: workoutsRes.rows || [],
            checkins: checkinsRes.rows || [],
            profile: profileRes.rows[0] || {},
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar dashboard.' });
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const workoutsRes = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1",
            [req.session.user.id]
        );
        res.render('pages/client-workouts', { title: 'Meus Treinos - Momentum Fit', workouts: workoutsRes.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar treinos.' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT u.name, u.email, cp.* FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1",
            [req.session.user.id]
        );
        res.render('pages/client-profile', { title: 'Meu Perfil - Momentum Fit', profile: result.rows[0] || {} });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar perfil.' });
    }
});

router.post('/profile', async (req, res) => {
    const { name, age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment } = req.body;
    const userId = req.session.user.id;
    try {
        await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, userId]);
        await pool.query(`
            UPDATE client_profiles SET 
            age = $1, weight = $2, height = $3, fitness_level = $4, goals = $5, 
            medical_conditions = $6, training_days = $7, equipment = $8
            WHERE user_id = $9`, 
            [age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment, userId]
        );
        req.session.user.name = name; 
        res.redirect('/client/profile');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao atualizar perfil.' });
    }
});

module.exports = router;
