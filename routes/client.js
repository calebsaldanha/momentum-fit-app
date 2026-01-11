const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}

// Verifica se o perfil tem os dados essenciais
function checkMissingProfile(client) {
    if (!client) return true;
    // Verifica campos críticos da anamnese
    if (!client.height || !client.current_weight || !client.fitness_goals) return true;
    return false;
}

// Dashboard do Cliente
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const clientQuery = `
            SELECT u.name, u.email, u.profile_image, c.id as client_real_id, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1
        `;
        
        const clientRes = await db.query(clientQuery, [req.session.user.id]);
        const clientData = clientRes.rows[0];

        // === REDIRECIONAMENTO FORÇADO ===
        // Se não tiver dados ou faltar campos críticos, manda pra anamnese
        if (!clientData || checkMissingProfile(clientData)) {
            // Verifica se não estamos num loop (query param onboarding)
            if (!req.query.onboarding) {
                return res.redirect('/client/initial-form');
            }
        }

        // Buscar Treinos
        let workouts = [];
        if (clientData && clientData.client_real_id) {
            const workoutsQuery = `
                SELECT w.*, u.name as trainer_name 
                FROM workouts w
                LEFT JOIN trainers t ON w.trainer_id = t.id
                LEFT JOIN users u ON t.user_id = u.id
                WHERE w.client_id = $1 AND w.status = 'pending' 
                ORDER BY w.created_at DESC LIMIT 3
            `;
            const workoutsRes = await db.query(workoutsQuery, [clientData.client_real_id]);
            workouts = workoutsRes.rows;
        }

        res.render('pages/client-dashboard', { 
            title: 'Painel do Aluno',
            user: req.session.user,
            clientProfile: clientData || {},
            missingProfile: checkMissingProfile(clientData),
            workouts: workouts || []
        });

    } catch (err) {
        console.error("Erro dashboard:", err);
        return res.render('pages/error', { title: 'Erro', message: "Erro ao carregar dashboard" });
    }
});

// GET - Exibir Formulário Inicial
router.get('/initial-form', isAuthenticated, async (req, res) => {
    try {
        const query = `
            SELECT u.name, u.email, c.* FROM users u 
            LEFT JOIN clients c ON u.id = c.user_id 
            WHERE u.id = $1
        `;
        const { rows } = await db.query(query, [req.session.user.id]);
        
        res.render('pages/initial-form', { 
            title: 'Anamnese',
            user: req.session.user,
            profile: rows[0] || {},
            error: null,
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        console.error(err);
        res.render('pages/error', { title: 'Erro', message: "Erro ao carregar formulário" });
    }
});

// POST - Processar Formulário Inicial
router.post('/initial-form', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    // Captura todos os campos da anamnese completa
    const { 
        age, phone, gender_identity, sex_assigned_at_birth,
        hormonal_treatment, hormonal_details,
        weight, height, body_fat,
        measure_waist, measure_hip, measure_arm, measure_leg,
        main_goal, secondary_goals, specific_event,
        medical_conditions, medications, injuries, surgeries, allergies,
        fitness_level, training_days, workout_preference, availability, equipment,
        past_activity, liked_activities, disliked_activities,
        sleep_hours, diet_description, challenges
    } = req.body;

    // Campos concatenados para compatibilidade com sistema antigo (opcional)
    const lifestyleConcat = `Dieta: ${diet_description || ''}. Sono: ${sleep_hours || ''}h.`;
    const availabilityConcat = `Dias: ${training_days}. Tempo: ${availability}.`;

    try {
        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        
        if (check.rows.length > 0) {
            // UPDATE Completo
            const updateQuery = `
                UPDATE clients SET 
                phone = $1, current_weight = $2, height = $3, fitness_goals = $4,
                injuries = $5, medications = $6, lifestyle = $7, availability = $8,
                age = $9, gender_identity = $10, sex_assigned_at_birth = $11,
                hormonal_treatment = $12, hormonal_details = $13, body_fat = $14,
                measure_waist = $15, measure_hip = $16, measure_arm = $17, measure_leg = $18,
                secondary_goals = $19, specific_event = $20, medical_conditions = $21,
                surgeries = $22, allergies = $23, fitness_level = $24,
                training_days_frequency = $25, workout_preference = $26, equipment = $27,
                time_availability = $28, sleep_hours = $29, diet_description = $30,
                challenges = $31, liked_activities = $32, disliked_activities = $33, past_activity = $34
                WHERE user_id = $35
            `;

            await db.query(updateQuery, [
                phone, weight, height, main_goal, 
                injuries, medications, lifestyleConcat, availabilityConcat, 
                age, gender_identity, sex_assigned_at_birth,
                hormonal_treatment === 'true', hormonal_details, body_fat,
                measure_waist, measure_hip, measure_arm, measure_leg,
                secondary_goals, specific_event, medical_conditions,
                surgeries, allergies, fitness_level,
                training_days, workout_preference, equipment,
                availability, sleep_hours, diet_description,
                challenges, liked_activities, disliked_activities, past_activity,
                userId
            ]);

        } else {
            // INSERT Completo
            const insertQuery = `
                INSERT INTO clients (
                    user_id, phone, current_weight, height, fitness_goals, injuries, medications, lifestyle, availability,
                    age, gender_identity, sex_assigned_at_birth, hormonal_treatment, hormonal_details, body_fat,
                    measure_waist, measure_hip, measure_arm, measure_leg, secondary_goals, specific_event,
                    medical_conditions, surgeries, allergies, fitness_level, training_days_frequency,
                    workout_preference, equipment, time_availability, sleep_hours, diet_description, challenges,
                    liked_activities, disliked_activities, past_activity
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9,
                    $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21,
                    $22, $23, $24, $25, $26,
                    $27, $28, $29, $30, $31, $32,
                    $33, $34, $35
                )
            `;

            await db.query(insertQuery, [
                userId, phone, weight, height, main_goal, injuries, medications, lifestyleConcat, availabilityConcat,
                age, gender_identity, sex_assigned_at_birth, hormonal_treatment === 'true', hormonal_details, body_fat,
                measure_waist, measure_hip, measure_arm, measure_leg, secondary_goals, specific_event,
                medical_conditions, surgeries, allergies, fitness_level, training_days,
                workout_preference, equipment, availability, sleep_hours, diet_description, challenges,
                liked_activities, disliked_activities, past_activity
            ]);
        }

        // Redireciona para dashboard
        res.redirect('/client/dashboard?onboarding=success');

    } catch (err) {
        console.error("Erro ao salvar anamnese:", err);
        res.render('pages/initial-form', { 
            title: 'Anamnese', user: req.session.user, profile: req.body, error: 'Erro ao salvar dados.', csrfToken: req.csrfToken()
        });
    }
});

// Outras rotas (profile, workouts...)
router.get('/profile', isAuthenticated, async (req, res) => {
    const query = `SELECT u.name, u.email, u.profile_image, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
    const { rows } = await db.query(query, [req.session.user.id]);
    res.render('pages/client-profile', { title: 'Meu Perfil', user: req.session.user, clientProfile: rows[0] || {} });
});

router.post('/profile', isAuthenticated, async (req, res) => {
    // Manter lógica de update simplificada ou expandir conforme necessidade
    res.redirect('/client/profile'); 
});

router.get('/workouts', isAuthenticated, async (req, res) => {
    const clientRes = await db.query("SELECT id FROM clients WHERE user_id = $1", [req.session.user.id]);
    const workoutsRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [clientRes.rows[0]?.id]);
    res.render('pages/client-workouts', { title: 'Meus Treinos', user: req.session.user, workouts: workoutsRes.rows });
});

router.get('/workouts/:id', isAuthenticated, async (req, res) => {
    const workoutId = req.params.id;
    const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1", [workoutId]);
    const exercisesRes = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [workoutId]);
    res.render('pages/workout-details', { title: workoutRes.rows[0].title, user: req.session.user, workout: workoutRes.rows[0], exercises: exercisesRes.rows });
});

module.exports = router;
