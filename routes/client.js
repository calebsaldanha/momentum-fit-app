const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClientAuth);

router.get('/initial-form', async (req, res) => {
    try {
        const check = await pool.query("SELECT 1 FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        if (check.rows.length > 0) return res.redirect('/client/dashboard');
        res.render('pages/initial-form', { title: 'Complete seu Perfil - Momentum Fit' });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao verificar perfil.' });
    }
});

router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    const { age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment } = req.body;
    try {
        await pool.query(
            \`INSERT INTO client_profiles 
            (user_id, age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())\`,
            [age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment]
        );
        res.redirect('/client/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao salvar perfil.' });
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [userId]);
        if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');

        const workoutsRes = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC LIMIT 5",
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
    } catch (err) { res.status(500).render('pages/error', { title: 'Erro', message: 'Erro ao carregar dashboard.' }); }
});

router.get('/workouts', async (req, res) => {
    try {
        const query = \`
            SELECT w.*, u.name as trainer_name,
            (SELECT COUNT(*) FROM workout_checkins wc WHERE wc.workout_id = w.id AND wc.created_at::date = CURRENT_DATE) as checked_in_today
            FROM workouts w 
            LEFT JOIN users u ON w.trainer_id = u.id 
            WHERE w.client_id = $1 
            ORDER BY w.created_at DESC
        \`;
        const workoutsRes = await pool.query(query, [req.session.user.id]);
        res.render('pages/client-workouts', { title: 'Meus Treinos - Momentum Fit', workouts: workoutsRes.rows });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar treinos.' });
    }
});

router.post('/workouts/checkin/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        const clientId = req.session.user.id;
        const { rating, notes } = req.body;

        await pool.query(
            "INSERT INTO workout_checkins (workout_id, client_id, completed, rating, notes, created_at) VALUES ($1, $2, true, $3, $4, NOW())",
            [workoutId, clientId, rating || null, notes || '']
        );
        
        res.redirect('/client/workouts');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao realizar check-in.' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query("SELECT u.name, u.email, cp.* FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.session.user.id]);
        res.render('pages/client-profile', { title: 'Meu Perfil - Momentum Fit', profile: result.rows[0] || {} });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao carregar perfil.' }); }
});

router.post('/profile', async (req, res) => {
    const { name, age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment } = req.body;
    const userId = req.session.user.id;
    
    const client = await pool.connect(); // Cliente para transação
    
    try {
        await client.query('BEGIN'); // Inicia transação

        // 1. Atualiza Tabela Users
        await client.query("UPDATE users SET name = $1 WHERE id = $2", [name, userId]);
        
        // 2. Atualiza Tabela Client Profiles
        await client.query(
            \`UPDATE client_profiles SET age=$1, weight=$2, height=$3, fitness_level=$4, goals=$5, medical_conditions=$6, training_days=$7, equipment=$8 WHERE user_id=$9\`, 
            [age, weight, height, fitness_level, goals, medical_conditions, training_days, equipment, userId]
        );

        await client.query('COMMIT'); // Confirma alterações

        // Atualiza sessão
        req.session.user.name = name;
        req.session.save(() => {
            res.redirect('/client/profile');
        });

    } catch (err) { 
        await client.query('ROLLBACK'); // Desfaz tudo se der erro
        console.error("Erro na transação de perfil:", err);
        res.status(500).render('pages/error', { message: 'Erro ao atualizar perfil.' }); 
    } finally {
        client.release(); // Libera conexão
    }
});

module.exports = router;
