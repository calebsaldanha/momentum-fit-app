const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/auth/login');
}

// Middleware para verificar se a anamnese existe
async function requireAnamnesis(req, res, next) {
    try {
        const clientQuery = `SELECT u.name, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
        const { rows } = await db.query(clientQuery, [req.session.user.id]);
        const client = rows[0];
        
        // Verifica campos críticos
        const isProfileIncomplete = !client || !client.height || !client.current_weight || !client.fitness_goals;

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

// --- ROTA GET FORMULÁRIO ---
router.get('/initial-form', async (req, res) => {
    try {
        const query = `SELECT u.name, u.email, c.* FROM users u LEFT JOIN clients c ON u.id = c.user_id WHERE u.id = $1`;
        const { rows } = await db.query(query, [req.session.user.id]);
        
        // Extrair dados do campo lifestyle se estiver formatado
        let profile = rows[0] || {};
        if (profile.lifestyle && profile.lifestyle.includes('|')) {
            // Lógica simples para tentar recuperar dados antigos se necessário
        }

        res.render('pages/initial-form', { 
            title: 'Anamnese', 
            user: req.session.user, 
            profile: profile, 
            error: null, 
            csrfToken: req.csrfToken(),
            currentPage: 'initial-form'
        });
    } catch (err) { res.render('pages/error', { title: 'Erro', message: "Erro ao carregar" }); }
});

// --- ROTA POST FORMULÁRIO (SALVAR) ---
router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    const { 
        age, phone, profession, sex_assigned_at_birth,
        weight, height, body_fat, measure_waist, measure_hip, measure_arm,
        sleep_hours, stress_level, water_intake, habits, diet_description, injuries,
        main_goal, fitness_level, training_days, equipment
    } = req.body;

    // CONCATENAÇÃO INTELIGENTE para campos que não têm coluna própria no banco
    // Isso garante que Profissão, Sono, Água, Stress e Hábitos sejam salvos em 'lifestyle'
    const lifestyleFull = `Profissão: ${profession || 'N/A'} | Sono: ${sleep_hours || 'N/A'} | Stress: ${stress_level || 'N/A'} | Água: ${water_intake || 'N/A'} | Hábitos: ${habits || 'N/A'} | Dieta: ${diet_description || 'N/A'}`;

    try {
        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        
        if (check.rows.length > 0) {
            // UPDATE
            await db.query(`
                UPDATE clients SET 
                phone=$1, age=$2, sex_assigned_at_birth=$3,
                current_weight=$4, height=$5, body_fat=$6, measure_waist=$7, measure_hip=$8, measure_arm=$9,
                lifestyle=$10, injuries=$11,
                fitness_goals=$12, fitness_level=$13, training_days_frequency=$14, equipment=$15
                WHERE user_id=$16
            `, [
                phone, age, sex_assigned_at_birth,
                weight, height, body_fat, measure_waist, measure_hip, measure_arm,
                lifestyleFull, injuries,
                main_goal, fitness_level, training_days, equipment,
                userId
            ]);
        } else {
            // INSERT
            await db.query(`
                INSERT INTO clients (
                    user_id, phone, age, sex_assigned_at_birth,
                    current_weight, height, body_fat, measure_waist, measure_hip, measure_arm,
                    lifestyle, injuries,
                    fitness_goals, fitness_level, training_days_frequency, equipment
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
                userId, phone, age, sex_assigned_at_birth,
                weight, height, body_fat, measure_waist, measure_hip, measure_arm,
                lifestyleFull, injuries,
                main_goal, fitness_level, training_days, equipment
            ]);
        }
        res.redirect('/client/dashboard?success=anamnese_saved');
    } catch (err) {
        console.error("Erro form:", err);
        res.render('pages/initial-form', { 
            title: 'Anamnese', user: req.session.user, profile: req.body, 
            error: 'Erro ao salvar. Tente novamente.', csrfToken: req.csrfToken(), currentPage: 'initial-form' 
        });
    }
});

// Middleware e rotas restantes
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
    res.render('pages/client-profile', { 
        title: 'Meu Perfil', user: req.session.user, profile: res.locals.clientProfile, currentPage: 'profile', csrfToken: req.csrfToken()
    });
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
