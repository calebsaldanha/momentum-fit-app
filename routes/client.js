const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}

// Middleware para verificar se perfil existe
async function requireAnamnesis(req, res, next) {
    try {
        const clientQuery = `SELECT u.name, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
        const { rows } = await db.query(clientQuery, [req.session.user.id]);
        const clientObj = rows[0];
        
        // Verifica campos críticos
        const isProfileIncomplete = !clientObj || !clientObj.height || !clientObj.current_weight || !clientObj.fitness_goals;

        if (isProfileIncomplete && req.path !== '/initial-form') {
            return res.redirect('/client/initial-form?alert=missing_profile');
        }
        res.locals.clientProfile = clientObj || {};
        next();
    } catch (err) {
        console.error(err); next();
    }
}

router.use(isAuthenticated);

// --- ROTA GET FORMULÁRIO INICIAL ---
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
    } catch (err) { res.render('pages/error', { title: 'Erro', message: "Erro ao carregar" }); }
});

// --- ROTA POST (SALVAR PERFIL) ---
router.post(['/initial-form', '/profile/update'], async (req, res) => {
    const userId = req.session.user.id;
    const redirectUrl = req.path.includes('initial-form') ? '/client/dashboard?success=anamnese_saved' : '/client/profile?success=updated';

    const { 
        name, birthDate, gender, weight, height, 
        primaryGoal, goalDeadline, focusArea,
        injuries, injuryDetails, medications, surgeries, medicalHistory,
        occupationType, sleepHours, stressLevel, waterIntake,
        experienceLevel, frequency, workoutLocation
    } = req.body;

    const injuriesList = Array.isArray(injuries) ? injuries.join(', ') : (injuries || '');
    const medicalHistoryList = Array.isArray(medicalHistory) ? medicalHistory.join(', ') : (medicalHistory || '');
    const injuriesFull = [injuriesList, injuryDetails].filter(Boolean).join('. Detalhes: ');

    try {
        if (name) {
            await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
            req.session.user.name = name; 
        }

        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        
        if (check.rows.length > 0) {
            await db.query(`
                UPDATE clients SET 
                birth_date=$1, sex_assigned_at_birth=$2, current_weight=$3, height=$4,
                fitness_goals=$5, goal_deadline=$6, focus_area=$7,
                injuries=$8, medications=$9, surgeries=$10, medical_history=$11,
                occupation=$12, sleep_hours=$13, stress_level=$14, water_intake=$15,
                fitness_level=$16, training_days_frequency=$17, equipment=$18,
                updated_at=NOW()
                WHERE user_id=$19
            `, [
                birthDate || null, gender, weight, height,
                primaryGoal, goalDeadline, focusArea,
                injuriesFull, medications, surgeries, medicalHistoryList,
                occupationType, sleepHours, stressLevel, waterIntake,
                experienceLevel, frequency, workoutLocation,
                userId
            ]);
        } else {
            await db.query(`
                INSERT INTO clients (
                    user_id, birth_date, sex_assigned_at_birth, current_weight, height,
                    fitness_goals, goal_deadline, focus_area,
                    injuries, medications, surgeries, medical_history,
                    occupation, sleep_hours, stress_level, water_intake,
                    fitness_level, training_days_frequency, equipment
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            `, [
                userId, birthDate || null, gender, weight, height,
                primaryGoal, goalDeadline, focusArea,
                injuriesFull, medications, surgeries, medicalHistoryList,
                occupationType, sleepHours, stressLevel, waterIntake,
                experienceLevel, frequency, workoutLocation
            ]);
        }
        req.flash('success', 'Perfil salvo com sucesso!');
        res.redirect(redirectUrl);
    } catch (err) {
        console.error("Erro ao salvar perfil:", err);
        req.flash('error', 'Erro ao processar dados.');
        res.redirect(redirectUrl);
    }
});

router.use(requireAnamnesis);

router.get('/dashboard', async (req, res) => {
    try {
        const clientData = res.locals.clientProfile;
        let workouts = [];
        if (clientData.id) {
            const wRes = await db.query(`SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN trainers t ON w.trainer_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC LIMIT 3`, [clientData.id]);
            workouts = wRes.rows;
        }
        res.render('pages/client-dashboard', { 
            title: 'Painel', user: req.session.user, clientProfile: clientData, missingProfile: false, workouts, currentPage: 'dashboard', csrfToken: req.csrfToken()
        });
    } catch (e) { res.redirect('/'); }
});

router.get('/profile', async (req, res) => {
    try {
        const query = `SELECT u.name, u.email, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
        const { rows } = await db.query(query, [req.session.user.id]);
        
        // CORREÇÃO: Usamos 'clientData' em vez de 'client' para evitar qualquer conflito de nome na View
        res.render('pages/client-profile', { 
            title: 'Meu Perfil', 
            user: req.session.user, 
            clientData: rows[0] || {}, 
            currentPage: 'profile', 
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        console.error(err); res.redirect('/client/dashboard');
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const workoutsRes = await db.query("SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN trainers t ON w.trainer_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE w.client_id = $1 ORDER BY w.created_at DESC", [res.locals.clientProfile.id]);
        res.render('pages/client-workouts', { title: 'Meus Treinos', user: req.session.user, workouts: workoutsRes.rows, currentPage: 'workouts', csrfToken: req.csrfToken() });
    } catch(e) { res.redirect('/client/dashboard'); }
});

router.get('/workouts/:id', async (req, res) => {
    try {
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1 AND client_id = $2", [req.params.id, res.locals.clientProfile.id]);
        if (workoutRes.rows.length === 0) return res.redirect('/client/workouts');
        const exercisesRes = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [req.params.id]);
        res.render('pages/workout-details', { title: 'Detalhes', user: req.session.user, workout: workoutRes.rows[0], exercises: exercisesRes.rows, currentPage: 'workouts', csrfToken: req.csrfToken() });
    } catch(e) { res.redirect('/client/workouts'); }
});

module.exports = router;
