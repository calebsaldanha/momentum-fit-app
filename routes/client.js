const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { pool } = require('../database/db');

const requireClient = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') {
        return next();
    }
    res.redirect('/auth/login');
};

// Dashboard do Cliente
router.get('/dashboard', requireClient, async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Verifica se tem perfil preenchido (para o aviso)
        const profileCheck = await pool.query("SELECT id FROM client_profiles WHERE user_id = $1", [userId]);
        const hasProfile = profileCheck.rows.length > 0;

        // Verifica checkins da semana
        const checkinsRes = await pool.query(
            "SELECT COUNT(*) FROM checkins WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)", 
            [userId]
        );
        
        // Verifica treinos completados
        const completedRes = await pool.query(
            "SELECT COUNT(*) FROM workout_logs WHERE user_id = $1", 
            [userId]
        );

        // Busca o próximo treino
        const workouts = await db.getWorkoutsByUserId(userId);
        const nextWorkout = workouts.length > 0 ? workouts[0] : null;

        // Busca perfil completo se existir, para mostrar dados no dashboard
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [userId]);
        const profileData = profileRes.rows[0] || {};

        res.render('pages/client-dashboard', {
            title: 'Meu Painel',
            user: req.session.user,
            stats: {
                weeklyCheckins: checkinsRes.rows[0].count,
                completedWorkouts: completedRes.rows[0].count
            },
            nextWorkout: nextWorkout, workouts: workouts,
            profile: profileData,
            missingProfile: !hasProfile, // Flag para a view
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' });
    }
});

// GET: Formulário Inicial (Anamnese)
router.get('/initial-form', requireClient, async (req, res) => {
    try {
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const currentData = profileRes.rows[0] || {};

        res.render('pages/initial-form', {
            title: 'Ficha de Anamnese',
            user: req.session.user,
            profile: currentData,
            currentPage: 'initial-form'
        });
    } catch(err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

// POST: Salvar Formulário Inicial
router.post('/initial-form', requireClient, async (req, res) => {
    const userId = req.session.user.id;
    const {
        age, phone, gender_identity, sex_assigned_at_birth,
        hormonal_treatment, hormonal_details,
        weight, height, body_fat,
        measure_waist, measure_hip, measure_arm, measure_leg,
        main_goal, secondary_goals, specific_event,
        medical_conditions, medications, injuries, surgeries, allergies,
        fitness_level, training_days, workout_preference, availability, equipment,
        sleep_hours, diet_description, challenges
    } = req.body;

    try {
        const check = await pool.query("SELECT id FROM client_profiles WHERE user_id = $1", [userId]);

        if (check.rows.length > 0) {
            // Update
            const sql = `
                UPDATE client_profiles SET 
                    age=$1, phone=$2, gender_identity=$3, sex_assigned_at_birth=$4,
                    hormonal_treatment=$5, hormonal_details=$6,
                    weight=$7, height=$8, body_fat=$9,
                    measure_waist=$10, measure_hip=$11, measure_arm=$12, measure_leg=$13,
                    main_goal=$14, secondary_goals=$15, specific_event=$16,
                    medical_conditions=$17, medications=$18, injuries=$19, surgeries=$20, allergies=$21,
                    fitness_level=$22, training_days=$23, workout_preference=$24, availability=$25, equipment=$26,
                    sleep_hours=$27, diet_description=$28, challenges=$29, updated_at=NOW()
                WHERE user_id=$30
            `;
            await pool.query(sql, [
                age, phone, gender_identity, sex_assigned_at_birth,
                hormonal_treatment === 'true', hormonal_details,
                weight, height, body_fat,
                measure_waist, measure_hip, measure_arm, measure_leg,
                main_goal, secondary_goals, specific_event,
                medical_conditions, medications, injuries, surgeries, allergies,
                fitness_level, training_days, workout_preference, availability, equipment,
                sleep_hours, diet_description, challenges,
                userId
            ]);
        } else {
            // Insert
            const sql = `
                INSERT INTO client_profiles (
                    user_id, age, phone, gender_identity, sex_assigned_at_birth,
                    hormonal_treatment, hormonal_details,
                    weight, height, body_fat,
                    measure_waist, measure_hip, measure_arm, measure_leg,
                    main_goal, secondary_goals, specific_event,
                    medical_conditions, medications, injuries, surgeries, allergies,
                    fitness_level, training_days, workout_preference, availability, equipment,
                    sleep_hours, diet_description, challenges
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
                )
            `;
            await pool.query(sql, [
                userId, age, phone, gender_identity, sex_assigned_at_birth,
                hormonal_treatment === 'true', hormonal_details,
                weight, height, body_fat,
                measure_waist, measure_hip, measure_arm, measure_leg,
                main_goal, secondary_goals, specific_event,
                medical_conditions, medications, injuries, surgeries, allergies,
                fitness_level, training_days, workout_preference, availability, equipment,
                sleep_hours, diet_description, challenges
            ]);
        }

        await pool.query("UPDATE users SET height = $1, weight = $2, goal = $3 WHERE id = $4", [height, weight, main_goal, userId]);

        res.redirect('/client/dashboard');
    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
        res.redirect('/client/initial-form?error=save_failed');
    }
});

router.get('/profile', requireClient, async (req, res) => {
    try {
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        const profile = profileRes.rows[0] || {};
        
        res.render('pages/client-profile', {
            title: 'Meu Perfil',
            user: req.session.user,
            detailedProfile: profile,
            currentPage: 'profile'
        });
    } catch(err) {
        res.redirect('/client/dashboard');
    }
});

router.get('/workouts', requireClient, async (req, res) => {
    try {
        const workouts = await db.getWorkoutsByUserId(req.session.user.id);
        res.render('pages/client-workouts', {
            title: 'Meus Treinos',
            user: req.session.user,
            workouts: workouts,
            currentPage: 'workouts'
        });
    } catch(err) {
        res.redirect('/client/dashboard');
    }
});

router.get('/workouts/:id', requireClient, async (req, res) => {
    try {
        const workoutRes = await pool.query("SELECT * FROM workouts WHERE id = $1 AND (client_id = $2 OR user_id = $2)", [req.params.id, req.session.user.id]);
        if(workoutRes.rows.length === 0) return res.redirect('/client/workouts');
        
        const exercisesRes = await pool.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [req.params.id]);
        
        res.render('pages/workout-details', {
            title: workoutRes.rows[0].title,
            user: req.session.user,
            workout: workoutRes.rows[0],
            exercises: exercisesRes.rows,
            currentPage: 'workouts'
        });
    } catch(err) {
        res.redirect('/client/workouts');
    }
});

module.exports = router;
