const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClientAuth);

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [userId]);
        
        if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');

        // Se estiver pendente, manda pro perfil, não pro painel
        if (req.session.user.status === 'pending_approval') {
            return res.redirect('/client/profile');
        }

        const profile = profileRes.rows[0];
        let imc = 0;
        if (profile.weight && profile.height) {
            imc = (parseFloat(profile.weight) / (parseFloat(profile.height) * parseFloat(profile.height))).toFixed(1);
        }

        const workoutsRes = await pool.query(
            "SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC LIMIT 5",
            [userId]
        );

        res.render('pages/client-dashboard', {
            title: 'Painel do Aluno',
            workouts: workoutsRes.rows || [],
            checkins: [],
            profile: profile,
            imc: imc,
            user: req.session.user,
            currentPage: 'dashboard'
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao carregar dashboard.' }); }
});

// Form Inicial (Exibir)
router.get('/initial-form', async (req, res) => {
    try {
        const check = await pool.query("SELECT 1 FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        if (check.rows.length > 0) return res.redirect('/client/profile'); 
        
        res.render('pages/initial-form', { 
            title: 'Avaliação Inicial', 
            user: req.session.user,
            error: null,
            profile: null,
            csrfToken: res.locals.csrfToken
        });
    } catch (err) {
        res.status(500).render('pages/error', { message: 'Erro ao verificar perfil.' });
    }
});

// Form Inicial (Processar)
router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    // Captura todos os campos
    const { 
        age, phone, gender_identity, sex_assigned_at_birth, 
        weight, height, fitness_level, 
        main_goal, secondary_goals, specific_event,
        medical_conditions, medications, surgeries, allergies, injuries,
        training_days, equipment, workout_preference, availability, challenges,
        diet_description, sleep_hours,
        measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
        hormonal_treatment, hormonal_details
    } = req.body;

    try {
        const query = `
            INSERT INTO client_profiles (
                user_id, age, phone, gender_identity, sex_assigned_at_birth,
                weight, height, fitness_level, 
                main_goal, secondary_goals, specific_event,
                medical_conditions, medications, surgeries, allergies, injuries,
                training_days, equipment, workout_preference, availability, challenges,
                diet_description, sleep_hours,
                measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
                hormonal_treatment, hormonal_details,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, 
                $9, $10, $11, 
                $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21,
                $22, $23,
                $24, $25, $26, $27, $28,
                $29, $30,
                NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()`;

        const values = [
            userId, parseInt(age)||0, phone||'', gender_identity||'', sex_assigned_at_birth||'',
            parseFloat(weight)||0, parseFloat(height)||0, fitness_level||'beginner',
            main_goal||'', secondary_goals||'', specific_event||'',
            medical_conditions||'', medications||'', surgeries||'', allergies||'', injuries||'',
            parseInt(training_days)||3, equipment||'', workout_preference||'', availability||'', challenges||'',
            diet_description||'', sleep_hours||'',
            parseFloat(measure_waist)||0, parseFloat(measure_hip)||0, parseFloat(measure_arm)||0, parseFloat(measure_leg)||0, parseFloat(body_fat)||0,
            hormonal_treatment === 'true', hormonal_details || ''
        ];

        await pool.query(query, values);
        await notificationService.notifyNewClient(req.session.user.name, userId).catch(e => console.error("Erro notif:", e));

        // REDIRECIONA PARA O PERFIL EM VEZ DO DASHBOARD
        res.redirect('/client/profile');
    } catch (err) {
        console.error("Erro form inicial:", err);
        res.render('pages/initial-form', { 
            title: 'Avaliação Inicial', 
            user: req.session.user, 
            error: 'Erro ao salvar dados.', 
            profile: req.body, 
            csrfToken: req.csrfToken() 
        });
    }
});

// Perfil (Visualizar)
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query("SELECT u.name, u.email, cp.* FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.session.user.id]);
        const profile = result.rows[0] || {};
        
        let imc = 0;
        if (profile.weight && profile.height) {
            imc = (parseFloat(profile.weight) / (parseFloat(profile.height) * parseFloat(profile.height))).toFixed(1);
        }

        res.render('pages/client-profile', { 
            title: 'Meu Perfil', 
            profile, 
            imc, 
            user: req.session.user, 
            success: req.query.success,
            currentPage: 'profile' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro perfil.' }); }
});

// Perfil (Atualizar Completo)
router.post('/profile', async (req, res) => {
    const userId = req.session.user.id;
    const { 
        name, phone, weight, height, age, fitness_level, 
        main_goal, secondary_goals, medical_conditions, medications,
        injuries, allergies, sleep_hours, diet_description
    } = req.body;

    try {
        // Atualiza Nome
        await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, userId]);
        
        // Atualiza Perfil (Campos principais que o aluno pode editar)
        const query = `
            UPDATE client_profiles SET 
                phone=$1, weight=$2, height=$3, age=$4, fitness_level=$5,
                main_goal=$6, secondary_goals=$7, medical_conditions=$8, medications=$9,
                injuries=$10, allergies=$11, sleep_hours=$12, diet_description=$13,
                updated_at=NOW()
            WHERE user_id=$14
        `;
        
        const values = [
            phone, parseFloat(weight)||0, parseFloat(height)||0, parseInt(age)||0, fitness_level,
            main_goal, secondary_goals, medical_conditions, medications,
            injuries, allergies, sleep_hours, diet_description,
            userId
        ];

        await pool.query(query, values);
        req.session.user.name = name;
        
        res.redirect('/client/profile?success=Dados atualizados com sucesso.');
    } catch (err) { 
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao atualizar perfil.' }); 
    }
});

// Workouts
router.get('/workouts', async (req, res) => {
    // Se pendente, não vê treinos
    if (req.session.user.status === 'pending_approval') return res.redirect('/client/profile');

    try {
        const workoutsRes = await pool.query("SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', { title: 'Meus Treinos', workouts: workoutsRes.rows, user: req.session.user, currentPage: 'workouts' });
    } catch(e) { res.render('pages/error', { message: 'Erro treinos.' }); }
});

module.exports = router;
