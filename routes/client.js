const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

// Middleware para bloquear acesso se não estiver ATIVO (Aprovado)
const requireActive = async (req, res, next) => {
    // Atualiza status da sessão do DB para garantir
    const result = await pool.query('SELECT status FROM users WHERE id = $1', [req.session.user.id]);
    const currentStatus = result.rows[0].status;
    req.session.user.status = currentStatus;

    if (currentStatus === 'active') return next();
    
    // Se não ativo, só pode ver perfil, initial-form
    res.redirect('/client/profile');
};

router.use(requireClientAuth);

router.get('/dashboard', requireActive, async (req, res) => {
    try {
        const profileRes = await pool.query('SELECT * FROM client_profiles WHERE user_id = $1', [req.session.user.id]);
        if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');

        const workoutsRes = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 3", [req.session.user.id]);
        
        res.render('pages/client-dashboard', { 
            title: 'Painel', user: req.session.user, workouts: workoutsRes.rows, currentPage: 'client-dashboard' 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro painel.' }); }
});

router.get('/initial-form', (req, res) => {
    res.render('pages/initial-form', { title: 'Avaliação', error: null, csrfToken: res.locals.csrfToken });
});

router.post('/initial-form', async (req, res) => {
    // ... (Recebimento de todos os campos igual anterior) ...
    const { 
        age, phone, gender_identity, sex_assigned_at_birth, main_goal, secondary_goals, specific_event,
        medical_conditions, medications, surgeries, allergies, past_activity, fitness_level, injuries,
        liked_activities, disliked_activities, workout_preference, availability, challenges,
        diet_description, sleep_hours, weight, height, measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
        hormonal_treatment, hormonal_details
    } = req.body;

    try {
        const userId = req.session.user.id;
        // Upsert Query (Mesma do passo anterior)
        const query = `
            INSERT INTO client_profiles (
                user_id, age, phone, gender_identity, sex_assigned_at_birth,
                main_goal, secondary_goals, specific_event,
                medical_conditions, medications, surgeries, allergies,
                past_activity, fitness_level, injuries,
                liked_activities, disliked_activities, workout_preference, availability, challenges,
                diet_description, sleep_hours,
                weight, height, measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
                hormonal_treatment, hormonal_details, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                age=EXCLUDED.age, phone=EXCLUDED.phone, gender_identity=EXCLUDED.gender_identity,
                main_goal=EXCLUDED.main_goal, medical_conditions=EXCLUDED.medical_conditions,
                fitness_level=EXCLUDED.fitness_level, weight=EXCLUDED.weight, height=EXCLUDED.height, updated_at=NOW()
        `;
        const values = [userId, parseInt(age), phone, gender_identity, sex_assigned_at_birth, main_goal, secondary_goals, specific_event, medical_conditions, medications, surgeries, allergies, past_activity, fitness_level, injuries, liked_activities, disliked_activities, workout_preference, availability, challenges, diet_description, sleep_hours, parseFloat(weight), parseFloat(height), parseFloat(measure_waist||0), parseFloat(measure_hip||0), parseFloat(measure_arm||0), parseFloat(measure_leg||0), parseFloat(body_fat||0), hormonal_treatment==='true', hormonal_details||''];
        
        await pool.query(query, values);

        // MUDANÇA: Notificar Admin sobre novo cliente para avaliar
        await notificationService.notifyNewClient(req.session.user.name, userId);

        res.redirect('/client/profile?submitted=true');
    } catch (err) {
        console.error(err);
        res.render('pages/initial-form', { title: 'Erro', error: 'Erro ao salvar.', csrfToken: req.csrfToken() });
    }
});

router.get('/workouts', requireActive, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', { title: 'Meus Treinos', workouts: result.rows, currentPage: 'client-workouts' });
    } catch (err) { res.render('pages/error', { message: 'Erro treinos.' }); }
});

router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = result.rows[0] || {};
        
        // Atualiza status na sessão
        const userRes = await pool.query("SELECT status FROM users WHERE id = $1", [req.session.user.id]);
        req.session.user.status = userRes.rows[0].status;

        // CALCULO IMC NO BACKEND
        let imc = null;
        if (profile.weight && profile.height && profile.height > 0) {
            imc = (profile.weight / (profile.height * profile.height)).toFixed(1);
        }

        let successMsg = req.query.submitted ? "Perfil enviado para análise! Aguarde a aprovação do treinador." : null;

        res.render('pages/client-profile', { 
            title: 'Meu Perfil', profile, imc, 
            user: req.session.user, currentPage: 'client-profile', success: successMsg 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro perfil.' }); }
});

module.exports = router;
