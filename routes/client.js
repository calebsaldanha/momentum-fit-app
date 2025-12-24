const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const notificationService = require('../utils/notificationService');

const requireClientAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
};

router.use(requireClientAuth);

function calculateIMC(weight, height) {
    if (!weight || !height) return '--';
    let w = parseFloat(String(weight).replace(',', '.'));
    let h = parseFloat(String(height).replace(',', '.'));
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return '--';
    if (h > 3) h = h / 100;
    return (w / (h * h)).toFixed(1);
}

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const profileRes = await pool.query("SELECT * FROM client_profiles WHERE user_id = $1", [userId]);
        
        if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');
        if (req.session.user.status === 'pending_approval') return res.redirect('/client/profile');

        const profile = profileRes.rows[0];
        const imc = calculateIMC(profile.weight, profile.height);

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

// Form Inicial
router.get('/initial-form', async (req, res) => {
    try {
        const check = await pool.query("SELECT 1 FROM client_profiles WHERE user_id = $1", [req.session.user.id]);
        if (check.rows.length > 0) return res.redirect('/client/profile'); 
        res.render('pages/initial-form', { 
            title: 'Avaliação Inicial', user: req.session.user, error: null, profile: null, csrfToken: res.locals.csrfToken
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro ao verificar perfil.' }); }
});

// Processar Form Completo
router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    // Extraindo TODOS os campos do body
    const { 
        age, phone, gender_identity, sex_assigned_at_birth, 
        weight, height, body_fat,
        measure_waist, measure_hip, measure_arm, measure_leg,
        main_goal, secondary_goals, specific_event,
        fitness_level, training_days, workout_preference, availability, equipment,
        medical_conditions, medications, surgeries, allergies, injuries,
        sleep_hours, diet_description, challenges,
        hormonal_treatment, hormonal_details
    } = req.body;

    try {
        const cleanFloat = (val) => parseFloat(String(val).replace(',', '.')) || 0;

        const query = `
            INSERT INTO client_profiles (
                user_id, age, phone, gender_identity, sex_assigned_at_birth,
                weight, height, body_fat,
                measure_waist, measure_hip, measure_arm, measure_leg,
                main_goal, secondary_goals, specific_event,
                fitness_level, training_days, workout_preference, availability, equipment,
                medical_conditions, medications, surgeries, allergies, injuries,
                sleep_hours, diet_description, challenges,
                hormonal_treatment, hormonal_details,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, 
                $9, $10, $11, $12,
                $13, $14, $15,
                $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25,
                $26, $27, $28,
                $29, $30,
                NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()`;

        const values = [
            userId, parseInt(age)||0, phone||'', gender_identity||'', sex_assigned_at_birth||'',
            cleanFloat(weight), cleanFloat(height), cleanFloat(body_fat),
            cleanFloat(measure_waist), cleanFloat(measure_hip), cleanFloat(measure_arm), cleanFloat(measure_leg),
            main_goal||'', secondary_goals||'', specific_event||'',
            fitness_level||'beginner', parseInt(training_days)||3, workout_preference||'', availability||'', equipment||'',
            medical_conditions||'', medications||'', surgeries||'', allergies||'', injuries||'',
            sleep_hours||'', diet_description||'', challenges||'',
            hormonal_treatment === 'true', hormonal_details || ''
        ];

        await pool.query(query, values);
        
        await notificationService.notifyNewClient(req.session.user.name, userId).catch(e => console.error(e));

        res.redirect('/client/profile');
    } catch (err) {
        console.error("Erro form inicial:", err);
        res.render('pages/initial-form', { 
            title: 'Avaliação Inicial', user: req.session.user, error: 'Erro ao salvar. Tente novamente.', profile: req.body, csrfToken: req.csrfToken() 
        });
    }
});

// Perfil
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query("SELECT u.name, u.email, cp.* FROM users u JOIN client_profiles cp ON u.id = cp.user_id WHERE u.id = $1", [req.session.user.id]);
        const profile = result.rows[0] || {};
        const imc = calculateIMC(profile.weight, profile.height);
        res.render('pages/client-profile', { 
            title: 'Meu Perfil', profile, imc, user: req.session.user, success: req.query.success, currentPage: 'profile' 
        });
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro perfil.' }); }
});

router.post('/profile', async (req, res) => {
    // Rota de Edição completa
    const userId = req.session.user.id;
    // Extraindo campos editáveis
    const { 
        name, phone, weight, height, age, fitness_level, 
        main_goal, secondary_goals, medical_conditions, medications,
        injuries, allergies, sleep_hours, diet_description
    } = req.body;

    try {
        const cleanFloat = (val) => parseFloat(String(val).replace(',', '.')) || 0;
        await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, userId]);
        
        const query = `
            UPDATE client_profiles SET 
                phone=$1, weight=$2, height=$3, age=$4, fitness_level=$5,
                main_goal=$6, secondary_goals=$7, medical_conditions=$8, medications=$9,
                injuries=$10, allergies=$11, sleep_hours=$12, diet_description=$13,
                updated_at=NOW()
            WHERE user_id=$14
        `;
        const values = [
            phone, cleanFloat(weight), cleanFloat(height), parseInt(age)||0, fitness_level,
            main_goal, secondary_goals, medical_conditions, medications,
            injuries, allergies, sleep_hours, diet_description,
            userId
        ];
        await pool.query(query, values);
        req.session.user.name = name;
        res.redirect('/client/profile?success=Dados atualizados.');
    } catch (err) { res.status(500).render('pages/error', { message: 'Erro update.' }); }
});

router.get('/workouts', async (req, res) => {
    if (req.session.user.status === 'pending_approval') return res.redirect('/client/profile');
    try {
        const workoutsRes = await pool.query("SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN users u ON w.trainer_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC", [req.session.user.id]);
        res.render('pages/client-workouts', { title: 'Meus Treinos', workouts: workoutsRes.rows, user: req.session.user, currentPage: 'workouts' });
    } catch(e) { res.render('pages/error', { message: 'Erro treinos.' }); }
});

module.exports = router;
