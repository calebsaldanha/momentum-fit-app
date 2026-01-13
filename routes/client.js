const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}

async function requireAnamnesis(req, res, next) {
    try {
        const clientQuery = `SELECT u.name, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
        const { rows } = await db.query(clientQuery, [req.session.user.id]);
        const client = rows[0];
        const isProfileIncomplete = !client || !client.height || !client.current_weight || !client.fitness_goals;

        // Se o perfil estiver incompleto, força o redirecionamento, exceto se já estiver no form
        if (isProfileIncomplete && req.path !== '/initial-form') {
            return res.redirect('/client/initial-form?alert=missing_profile');
        }
        res.locals.clientProfile = client || {};
        next();
    } catch (err) {
        console.error(err); next();
    }
}

router.use(isAuthenticated);

router.get('/initial-form', async (req, res) => {
    try {
        const query = `SELECT u.name, u.email, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
        const { rows } = await db.query(query, [req.session.user.id]);
        res.render('pages/initial-form', { 
            title: 'Anamnese', 
            user: req.session.user, 
            profile: rows[0] || {}, 
            error: null, 
            csrfToken: req.csrfToken(),
            currentPage: 'initial-form'
        });
    } catch (err) { res.render('pages/error', { title: 'Erro', message: "Erro ao carregar formulário" }); }
});

router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    // Captura TODOS os campos essenciais
    const { 
        phone, weight, height, main_goal, secondary_goals, specific_event,
        fitness_level, injuries, medications, medical_conditions, surgeries, allergies,
        training_days, availability, workout_preference, equipment, past_activity, liked_activities, disliked_activities,
        diet_description, sleep_hours, challenges,
        age, gender_identity, sex_assigned_at_birth, hormonal_treatment, hormonal_details, measure_waist, measure_hip, measure_arm, measure_leg, body_fat
    } = req.body;

    const lifestyle = `Dieta: ${diet_description}. Sono: ${sleep_hours}h. Desafios: ${challenges}`;
    
    // Converte checkbox/select booleanos corretamente
    const isHormonal = hormonal_treatment === 'true';

    try {
        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        
        if (check.rows.length > 0) {
            await db.query(`
                UPDATE clients SET 
                phone=$1, current_weight=$2, height=$3, fitness_goals=$4, fitness_level=$5, 
                injuries=$6, medications=$7, lifestyle=$8, time_availability=$9, age=$10, 
                gender_identity=$11, sex_assigned_at_birth=$12, hormonal_treatment=$13, hormonal_details=$14,
                measure_waist=$15, measure_hip=$16, measure_arm=$17, measure_leg=$18, body_fat=$19,
                secondary_goals=$20, specific_event=$21, medical_conditions=$22, surgeries=$23, allergies=$24,
                training_days_frequency=$25, workout_preference=$26, equipment=$27, past_activity=$28, liked_activities=$29, disliked_activities=$30
                WHERE user_id=$31
            `, 
            [
                phone, weight, height, main_goal, fitness_level, 
                injuries, medications, lifestyle, availability, age, 
                gender_identity, sex_assigned_at_birth, isHormonal, hormonal_details,
                measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
                secondary_goals, specific_event, medical_conditions, surgeries, allergies,
                training_days, workout_preference, equipment, past_activity, liked_activities, disliked_activities,
                userId
            ]);
        } else {
            await db.query(`
                INSERT INTO clients (
                    user_id, phone, current_weight, height, fitness_goals, fitness_level, 
                    injuries, medications, lifestyle, time_availability, age, gender_identity,
                    sex_assigned_at_birth, hormonal_treatment, hormonal_details,
                    measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
                    secondary_goals, specific_event, medical_conditions, surgeries, allergies,
                    training_days_frequency, workout_preference, equipment, past_activity, liked_activities, disliked_activities
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
                )
            `, 
            [
                userId, phone, weight, height, main_goal, fitness_level, 
                injuries, medications, lifestyle, availability, age, gender_identity,
                sex_assigned_at_birth, isHormonal, hormonal_details,
                measure_waist, measure_hip, measure_arm, measure_leg, body_fat,
                secondary_goals, specific_event, medical_conditions, surgeries, allergies,
                training_days, workout_preference, equipment, past_activity, liked_activities, disliked_activities
            ]);
        }
        res.redirect('/client/dashboard?onboarding=success');
    } catch (err) {
        console.error("Erro ao salvar formulário:", err);
        res.render('pages/initial-form', { title: 'Anamnese', user: req.session.user, profile: req.body, error: 'Erro ao salvar. Verifique os dados.', csrfToken: req.csrfToken(), currentPage: 'initial-form' });
    }
});

router.use(requireAnamnesis);

router.get('/dashboard', async (req, res) => {
    try {
        const clientData = res.locals.clientProfile;
        let workouts = [];
        if (clientData && clientData.id) {
            const wRes = await db.query(`SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN trainers t ON w.trainer_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE w.client_id = $1 AND w.status != 'archived' ORDER BY w.created_at DESC LIMIT 3`, [clientData.id]);
            workouts = wRes.rows;
        }
        res.render('pages/client-dashboard', { 
            title: 'Painel', 
            user: req.session.user, 
            clientProfile: clientData, 
            missingProfile: false, 
            workouts,
            currentPage: 'dashboard',
            csrfToken: req.csrfToken()
        });
    } catch (err) { res.render('pages/error', { title: 'Erro', message: "Erro dashboard" }); }
});

router.get('/profile', async (req, res) => {
    // CORREÇÃO CRÍTICA: Passando csrfToken para a view
    res.render('pages/client-profile', { 
        title: 'Meu Perfil', 
        user: req.session.user, 
        profile: res.locals.clientProfile, // Dados físicos (tabela clients)
        csrfToken: req.csrfToken(),
        currentPage: 'profile'
    });
});

router.post('/profile', async (req, res) => {
    // Rota para salvar edições rápidas do perfil (opcional, mas bom ter)
    const { phone, weight, height } = req.body;
    try {
        await db.query('UPDATE clients SET phone=$1, current_weight=$2, height=$3 WHERE user_id=$4', [phone, weight, height, req.session.user.id]);
        res.redirect('/client/profile?success=Atualizado com sucesso');
    } catch(e) {
        res.redirect('/client/profile?error=Erro ao atualizar');
    }
});

router.get('/workouts', async (req, res) => {
    const workoutsRes = await db.query("SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN trainers t ON w.trainer_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC", [res.locals.clientProfile.id]);
    res.render('pages/client-workouts', { 
        title: 'Meus Treinos', 
        user: req.session.user, 
        workouts: workoutsRes.rows,
        currentPage: 'workouts',
        csrfToken: req.csrfToken()
    });
});

router.get('/workouts/:id', async (req, res) => {
    try {
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1 AND client_id = $2", [req.params.id, res.locals.clientProfile.id]);
        if (workoutRes.rows.length === 0) return res.redirect('/client/workouts');
        const exercisesRes = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [req.params.id]);
        res.render('pages/workout-details', { 
            title: workoutRes.rows[0].title, 
            user: req.session.user, 
            workout: workoutRes.rows[0], 
            exercises: exercisesRes.rows,
            currentPage: 'workouts',
            csrfToken: req.csrfToken()
        });
    } catch(e) { res.redirect('/client/workouts'); }
});

module.exports = router;
