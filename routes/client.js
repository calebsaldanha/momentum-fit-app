const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') {
        return next();
    }
    res.redirect('/auth/login');
};

router.use(requireClientAuth);

router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [workoutsRes, checkinsRes] = await Promise.all([
            pool.query('SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC LIMIT 3', [userId]),
            pool.query('SELECT wc.*, w.title FROM workout_checkins wc JOIN workouts w ON wc.workout_id = w.id WHERE wc.client_id = $1 ORDER BY wc.created_at DESC LIMIT 5', [userId]),
        ]);

        res.render('pages/client-dashboard', {
            title: 'Meu Dashboard - Momentum Fit',
            workouts: workoutsRes.rows,
            checkins: checkinsRes.rows
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard do cliente:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar seu dashboard.' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await pool.query(`
            SELECT u.name, u.email, cp.*
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.user_id
            WHERE u.id = $1;
        `, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).render('pages/error', { message: 'Perfil não encontrado.' });
        }
        res.render('pages/client-profile', {
            title: 'Meu Perfil - Momentum Fit',
            profile: result.rows[0]
        });
    } catch (err) {
        console.error("Erro ao carregar perfil do cliente:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar seu perfil.' });
    }
});

router.post('/profile', async (req, res) => {
    const userId = req.session.user.id;
    // CORREÇÃO: Incluídos os campos novos na desestruturação
    const { 
        name, age, weight, height, fitness_level, goals, medical_conditions,
        training_days, training_duration, equipment, activity_level 
    } = req.body;

    try {
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
        
        // CORREÇÃO: Query atualizada para salvar os campos novos
        const profileQuery = `
            INSERT INTO client_profiles (
                user_id, age, weight, height, fitness_level, goals, medical_conditions,
                training_days, training_duration, equipment, activity_level
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (user_id) DO UPDATE SET
                age = EXCLUDED.age, 
                weight = EXCLUDED.weight, 
                height = EXCLUDED.height,
                fitness_level = EXCLUDED.fitness_level, 
                goals = EXCLUDED.goals, 
                medical_conditions = EXCLUDED.medical_conditions,
                training_days = EXCLUDED.training_days,
                training_duration = EXCLUDED.training_duration,
                equipment = EXCLUDED.equipment,
                activity_level = EXCLUDED.activity_level;
        `;
        await pool.query(profileQuery, [
            userId, age, weight || null, height || null, fitness_level, goals, medical_conditions,
            training_days || null, training_duration, equipment, activity_level
        ]);
        
        req.session.user.name = name;
        req.session.save(() => res.redirect('/client/profile'));
    } catch (err) {
        console.error("Erro ao atualizar perfil:", err);
        res.status(500).render('pages/error', { message: 'Ocorreu um erro ao atualizar suas informações.' });
    }
});

router.get('/initial-form', (req, res) => {
    res.render('pages/initial-form', { title: 'Complete seu Perfil', error: null });
});

router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    // CORREÇÃO: Incluídos os campos novos na desestruturação
    const { 
        age, weight, height, fitness_level, goals, medical_conditions,
        training_days, training_duration, equipment, activity_level
    } = req.body;

    try {
        // CORREÇÃO: Query atualizada para salvar os campos novos
        await pool.query(`
            INSERT INTO client_profiles (
                user_id, age, weight, height, fitness_level, goals, medical_conditions,
                training_days, training_duration, equipment, activity_level
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            ON CONFLICT (user_id) DO UPDATE SET
                age = EXCLUDED.age, 
                weight = EXCLUDED.weight, 
                height = EXCLUDED.height,
                fitness_level = EXCLUDED.fitness_level, 
                goals = EXCLUDED.goals, 
                medical_conditions = EXCLUDED.medical_conditions,
                training_days = EXCLUDED.training_days,
                training_duration = EXCLUDED.training_duration,
                equipment = EXCLUDED.equipment,
                activity_level = EXCLUDED.activity_level;
        `, [
            userId, age, weight || null, height || null, fitness_level, goals, medical_conditions,
            training_days || null, training_duration, equipment, activity_level
        ]);
        res.redirect('/client/dashboard');
    } catch (err) {
        console.error("Erro ao salvar formulário inicial:", err);
        res.render('pages/initial-form', { title: 'Complete seu Perfil', error: 'Ocorreu um erro ao salvar suas informações. Tente novamente.' });
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await pool.query('SELECT w.*, u.name as trainer_name FROM workouts w JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC', [userId]);
        res.render('pages/client-workouts', { title: 'Meus Treinos - Momentum Fit', workouts: result.rows });
    } catch (err) {
        console.error("Erro ao buscar treinos do cliente:", err);
        res.status(500).render('pages/error', { message: 'Não foi possível carregar seus treinos.' });
    }
});

module.exports = router;
