const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

router.use(ensureAuthenticated);
router.use(ensureRole('client'));

// --- DASHBOARD INTELIGENTE ---
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;

        // 1. Dados do Perfil
        const clientQuery = `SELECT id, current_weight, height, fitness_goals FROM clients WHERE user_id = $1`;
        const clientResult = await db.query(clientQuery, [userId]);
        
        if (clientResult.rows.length === 0) return res.redirect('/client/profile');
        const clientProfile = clientResult.rows[0];

        // 2. Stats (Treinos na semana)
        const statsQuery = `
            SELECT COUNT(*) as count 
            FROM checkins 
            WHERE user_id = $1 
            AND date >= date_trunc('week', CURRENT_DATE)
        `;
        const statsRes = await db.query(statsQuery, [userId]);
        const workoutsThisWeek = statsRes.rows[0].count;

        // 3. Próximo Treino
        const nextWorkoutQuery = `
            SELECT id, title, description, muscle_group 
            FROM workouts 
            WHERE client_id = $1 AND status = 'active'
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const workoutResult = await db.query(nextWorkoutQuery, [clientProfile.id]);
        const nextWorkout = workoutResult.rows[0] || null;

        // 4. Assinatura
        const subQuery = `
            SELECT p.name, s.end_date 
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1 AND s.status = 'active'
            LIMIT 1
        `;
        const subRes = await db.query(subQuery, [userId]);
        const subscription = subRes.rows[0] || null;

        res.render('pages/client-dashboard', {
            user: req.session.user,
            clientProfile,
            workoutsThisWeek,
            nextWorkout,
            subscription
        });

    } catch (err) {
        console.error('Erro Dashboard:', err);
        // Fallback seguro em caso de erro
        res.render('pages/client-dashboard', {
            user: req.session.user,
            clientProfile: {},
            workoutsThisWeek: 0,
            nextWorkout: null,
            subscription: null
        });
    }
});

// --- MEUS TREINOS ---
router.get('/workouts', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const clientRes = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        if (!clientRes.rows.length) return res.redirect('/client/profile');
        
        const workouts = await db.query(`
            SELECT w.*, (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) as exercise_count
            FROM workouts w 
            WHERE w.client_id = $1 
            ORDER BY w.status ASC, w.created_at DESC
        `, [clientRes.rows[0].id]);

        res.render('pages/client-workouts', { workouts: workouts.rows, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

// --- PERFIL (ANAMNESE) ---
router.get('/profile', async (req, res) => {
    try {
        const query = `
            SELECT u.name, u.email, u.profile_image, c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `;
        const result = await db.query(query, [req.session.user.id]);
        res.render('pages/client-profile', { 
            clientData: result.rows[0] || {}, 
            user: req.session.user 
        });
    } catch (err) {
        console.error('Erro Profile:', err);
        res.redirect('/client/dashboard');
    }
});

// ATUALIZAR PERFIL (Salvar dados detalhados)
router.post('/profile/update', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { 
            current_weight, height, fitness_goals, activity_level, injuries,
            available_equipment, training_days,
            meas_chest, meas_waist, meas_hips, meas_arms, meas_thighs,
            sleep_hours, stress_level, diet_type, hydration_level, alcohol_consumption, motivation_source
        } = req.body;

        const bodyMeasurements = {
            chest: meas_chest, waist: meas_waist, hips: meas_hips, arms: meas_arms, thighs: meas_thighs
        };

        const updateQuery = `
            UPDATE clients 
            SET current_weight = $1, height = $2, fitness_goals = $3, activity_level = $4, 
                injuries = $5, available_equipment = $6, training_days = $7, 
                body_measurements = $8, sleep_hours = $9, stress_level = $10,
                diet_type = $11, hydration_level = $12, alcohol_consumption = $13, motivation_source = $14,
                updated_at = NOW()
            WHERE user_id = $15
        `;

        await db.query(updateQuery, [
            current_weight, height, fitness_goals, activity_level, injuries,
            available_equipment, training_days, bodyMeasurements,
            sleep_hours, stress_level, diet_type, hydration_level, alcohol_consumption, motivation_source,
            userId
        ]);

        req.flash('success', 'Perfil atualizado com sucesso!');
        res.redirect('/client/profile');
    } catch (err) {
        console.error('Erro Update Profile:', err);
        req.flash('error', 'Erro ao atualizar perfil.');
        res.redirect('/client/profile');
    }
});

// Rotas Extras
router.get('/financial', (req, res) => res.render('pages/client-financial', { user: req.session.user, subscription: null, transactions: [] }));
router.get('/settings', async (req, res) => {
    const r = await db.query('SELECT * FROM users WHERE id=$1', [req.session.user.id]);
    res.render('pages/client-settings', { settingsUser: r.rows[0], user: req.session.user });
});
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { user: req.session.user }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach', { user: req.session.user }));

module.exports = router;
