const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

const requireActive = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT status FROM users WHERE id = $1', [req.session.user.id]);
        const currentStatus = result.rows[0].status;
        req.session.user.status = currentStatus; // Atualiza sessão
        
        if (currentStatus === 'active') return next();
        
        // Se pendente, permite apenas ver perfil, editar perfil e logout
        // OBS: A Home (/) é controlada em routes/index.js e não passa por aqui, então o acesso é livre.
        if (req.path === '/profile' || req.path === '/profile/edit') {
            return next();
        }
        
        res.redirect('/client/profile');
    } catch (err) {
        console.error(err);
        res.redirect('/auth/logout');
    }
};

router.use(requireClientAuth);

// Dashboard (Apenas Ativos)
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

// Formulário Inicial (Criação)
router.get('/initial-form', async (req, res) => {
    // Se já tem perfil, redireciona para edição
    const check = await pool.query('SELECT 1 FROM client_profiles WHERE user_id = $1', [req.session.user.id]);
    if (check.rows.length > 0) return res.redirect('/client/profile/edit');
    
    res.render('pages/initial-form', { title: 'Avaliação', error: null, profile: null, csrfToken: res.locals.csrfToken });
});

// Edição de Perfil
router.get('/profile/edit', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        if (result.rows.length === 0) return res.redirect('/client/initial-form');
        
        res.render('pages/initial-form', { 
            title: 'Editar Perfil', 
            error: null, 
            profile: result.rows[0], // Passa dados existentes para popular o form
            csrfToken: res.locals.csrfToken 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro ao carregar edição.' }); }
});

// Processar Formulário (Criação ou Edição)
router.post('/initial-form', async (req, res) => {
    const { 
        age, phone, gender_identity, sex_assigned_at_birth, main_goal, secondary_goals, specific_event,
        medical_conditions, medications, surgeries, allergies, past_activity, fitness_level, injuries,
        liked_activities, disliked_activities, workout_preference, availability, challenges,
        diet_description, sleep_hours, weight, height, measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
        hormonal_treatment, hormonal_details
    } = req.body;

    try {
        const userId = req.session.user.id;
        
        // Verifica se é novo cadastro para notificar
        const checkNew = await pool.query("SELECT 1 FROM client_profiles WHERE user_id = $1", [userId]);
        const isNewProfile = checkNew.rows.length === 0;

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
                age=EXCLUDED.age, phone=EXCLUDED.phone, gender_identity=EXCLUDED.gender_identity, sex_assigned_at_birth=EXCLUDED.sex_assigned_at_birth,
                main_goal=EXCLUDED.main_goal, secondary_goals=EXCLUDED.secondary_goals, specific_event=EXCLUDED.specific_event,
                medical_conditions=EXCLUDED.medical_conditions, medications=EXCLUDED.medications, surgeries=EXCLUDED.surgeries, allergies=EXCLUDED.allergies,
                past_activity=EXCLUDED.past_activity, fitness_level=EXCLUDED.fitness_level, injuries=EXCLUDED.injuries,
                liked_activities=EXCLUDED.liked_activities, disliked_activities=EXCLUDED.disliked_activities, workout_preference=EXCLUDED.workout_preference, availability=EXCLUDED.availability, challenges=EXCLUDED.challenges,
                diet_description=EXCLUDED.diet_description, sleep_hours=EXCLUDED.sleep_hours,
                weight=EXCLUDED.weight, height=EXCLUDED.height, measure_waist=EXCLUDED.measure_waist, measure_hip=EXCLUDED.measure_hip, measure_arm=EXCLUDED.measure_arm, measure_leg=EXCLUDED.measure_leg, body_fat=EXCLUDED.body_fat,
                hormonal_treatment=EXCLUDED.hormonal_treatment, hormonal_details=EXCLUDED.hormonal_details,
                updated_at=NOW()
        `;
        
        const values = [userId, parseInt(age), phone, gender_identity, sex_assigned_at_birth, main_goal, secondary_goals, specific_event, medical_conditions, medications, surgeries, allergies, past_activity, fitness_level, injuries, liked_activities, disliked_activities, workout_preference, availability, challenges, diet_description, sleep_hours, parseFloat(weight), parseFloat(height), parseFloat(measure_waist||0), parseFloat(measure_hip||0), parseFloat(measure_arm||0), parseFloat(measure_leg||0), parseFloat(body_fat||0), hormonal_treatment==='true', hormonal_details||''];
        
        await pool.query(query, values);

        if (isNewProfile) {
            await notificationService.notifyNewClient(req.session.user.name, userId);
        }

        res.redirect('/client/profile?submitted=true');
    } catch (err) {
        console.error(err);
        res.render('pages/initial-form', { title: 'Erro', error: 'Erro ao salvar.', profile: req.body, csrfToken: req.csrfToken() });
    }
});

// Perfil (Visível para Pendentes)
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = result.rows[0] || {};
        
        // Atualiza status na sessão
        const userRes = await pool.query("SELECT status FROM users WHERE id = $1", [req.session.user.id]);
        req.session.user.status = userRes.rows[0].status;

        // CALCULO IMC CORRIGIDO
        let imc = 0.0;
        if (profile.weight && profile.height && parseFloat(profile.height) > 0) {
            // Garante que são números
            const w = parseFloat(profile.weight);
            const h = parseFloat(profile.height);
            imc = (w / (h * h)).toFixed(1);
        }

        let successMsg = req.query.submitted ? "Perfil salvo com sucesso." : null;

        res.render('pages/client-profile', { 
            title: 'Meu Perfil', profile, imc, 
            user: req.session.user, currentPage: 'client-profile', success: successMsg 
        });
    } catch (err) { res.render('pages/error', { message: 'Erro perfil.' }); }
});

router.get('/workouts', requireActive, async (req, res) => { /* ... igual ... */ 
    const result = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
    res.render('pages/client-workouts', { title: 'Meus Treinos', workouts: result.rows, currentPage: 'client-workouts' });
});

module.exports = router;
