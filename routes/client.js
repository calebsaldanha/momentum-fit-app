const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');

// Middleware de Autenticação
const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') {
        return next();
    }
    return res.redirect('/auth/login');
};

router.use(requireClientAuth);

router.get('/dashboard', async (req, res) => {
    try {
        // Verificar se preencheu o formulário
        const profileRes = await pool.query('SELECT * FROM client_profiles WHERE user_id = $1', [req.session.user.id]);
        if (profileRes.rows.length === 0) {
            return res.redirect('/client/initial-form');
        }

        const workoutsRes = await pool.query(
            "SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 3", 
            [req.session.user.id]
        );
        
        res.render('pages/client-dashboard', { 
            title: 'Painel do Cliente', 
            user: req.session.user,
            workouts: workoutsRes.rows,
            currentPage: 'client-dashboard' 
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { message: 'Erro ao carregar painel.' });
    }
});

router.get('/initial-form', (req, res) => {
    res.render('pages/initial-form', { 
        title: 'Avaliação Inicial', 
        error: null,
        csrfToken: res.locals.csrfToken 
    });
});

router.post('/initial-form', async (req, res) => {
    const { 
        age, phone, gender_identity, sex_assigned_at_birth, 
        main_goal, secondary_goals, specific_event,
        medical_conditions, medications, surgeries, allergies,
        past_activity, fitness_level, injuries,
        liked_activities, disliked_activities, workout_preference, availability, challenges,
        diet_description, sleep_hours,
        weight, height, measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
        hormonal_treatment, hormonal_details
    } = req.body;

    try {
        const userId = req.session.user.id;
        
        // Upsert (Insert ou Update)
        const query = `
            INSERT INTO client_profiles (
                user_id, age, phone, gender_identity, sex_assigned_at_birth,
                main_goal, secondary_goals, specific_event,
                medical_conditions, medications, surgeries, allergies,
                past_activity, fitness_level, injuries,
                liked_activities, disliked_activities, workout_preference, availability, challenges,
                diet_description, sleep_hours,
                weight, height, measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
                hormonal_treatment, hormonal_details,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, 
                $9, $10, $11, $12, 
                $13, $14, $15, 
                $16, $17, $18, $19, $20, 
                $21, $22,
                $23, $24, $25, $26, $27, $28, $29,
                $30, $31,
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                age = EXCLUDED.age,
                phone = EXCLUDED.phone,
                gender_identity = EXCLUDED.gender_identity,
                main_goal = EXCLUDED.main_goal,
                medical_conditions = EXCLUDED.medical_conditions,
                fitness_level = EXCLUDED.fitness_level,
                weight = EXCLUDED.weight,
                height = EXCLUDED.height,
                updated_at = NOW();
        `;

        const values = [
            userId, parseInt(age), phone, gender_identity, sex_assigned_at_birth,
            main_goal, secondary_goals, specific_event,
            medical_conditions, medications, surgeries, allergies,
            past_activity, fitness_level, injuries,
            liked_activities, disliked_activities, workout_preference, availability, challenges,
            diet_description, sleep_hours,
            parseFloat(weight), parseFloat(height), 
            parseFloat(measure_waist || 0), parseFloat(measure_hip || 0), parseFloat(measure_arm || 0), parseFloat(measure_leg || 0), parseFloat(body_fat || 0),
            hormonal_treatment === 'true', hormonal_details || ''
        ];

        await pool.query(query, values);

        // Redireciona para o perfil com parâmetro de sucesso
        res.redirect('/client/profile?submitted=true');

    } catch (err) {
        console.error("Erro no form inicial:", err);
        res.render('pages/initial-form', { 
            title: 'Avaliação Inicial', 
            error: 'Erro ao salvar dados. Verifique os campos.', 
            csrfToken: req.csrfToken() 
        });
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', { title: 'Meus Treinos', workouts: result.rows, currentPage: 'client-workouts' });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar treinos.' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = result.rows[0] || {};
        
        let successMsg = null;
        if (req.query.submitted) {
            successMsg = "Seu perfil foi enviado para análise! Você receberá notificações sobre sua aprovação e novos treinos.";
        }

        res.render('pages/client-profile', { 
            title: 'Meu Perfil', 
            profile, 
            user: req.session.user, 
            currentPage: 'client-profile',
            success: successMsg
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao carregar perfil.' });
    }
});

module.exports = router;
