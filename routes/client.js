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
        res.render('pages/initial-form', { title: 'Anamnese', user: req.session.user, profile: rows[0] || {}, error: null, csrfToken: req.csrfToken() });
    } catch (err) { res.render('pages/error', { title: 'Erro', message: "Erro ao carregar formulário" }); }
});

router.post('/initial-form', async (req, res) => {
    const userId = req.session.user.id;
    const { phone, weight, height, main_goal, fitness_level, injuries, medications, training_days, availability, diet_description, sleep_hours, age, gender_identity } = req.body;
    const lifestyle = `Dieta: ${diet_description}. Sono: ${sleep_hours}h.`;
    const avail = `Dias: ${training_days}. Tempo: ${availability}.`;

    try {
        const check = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        if (check.rows.length > 0) {
            await db.query(`UPDATE clients SET phone=$1, current_weight=$2, height=$3, fitness_goals=$4, fitness_level=$5, injuries=$6, medications=$7, lifestyle=$8, availability=$9, age=$10, gender_identity=$11 WHERE user_id=$12`, 
            [phone, weight, height, main_goal, fitness_level, injuries, medications, lifestyle, avail, age, gender_identity, userId]);
        } else {
            await db.query(`INSERT INTO clients (user_id, phone, current_weight, height, fitness_goals, fitness_level, injuries, medications, lifestyle, availability, age, gender_identity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, 
            [userId, phone, weight, height, main_goal, fitness_level, injuries, medications, lifestyle, avail, age, gender_identity]);
        }
        res.redirect('/client/dashboard?onboarding=success');
    } catch (err) {
        res.render('pages/initial-form', { title: 'Anamnese', user: req.session.user, profile: req.body, error: 'Erro ao salvar.', csrfToken: req.csrfToken() });
    }
});

router.use(requireAnamnesis);

router.get('/dashboard', async (req, res) => {
    try {
        const clientData = res.locals.clientProfile;
        let workouts = [];
        if (clientData && clientData.id) {
            const wRes = await db.query(`SELECT w.*, u.name as trainer_name FROM workouts w LEFT JOIN trainers t ON w.trainer_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE w.client_id = $1 AND w.status = 'pending' ORDER BY w.created_at DESC LIMIT 3`, [clientData.id]);
            workouts = wRes.rows;
        }
        res.render('pages/client-dashboard', { title: 'Painel', user: req.session.user, clientProfile: clientData, missingProfile: false, workouts });
    } catch (err) { res.render('pages/error', { title: 'Erro', message: "Erro dashboard" }); }
});

router.get('/profile', async (req, res) => {
    res.render('pages/client-profile', { title: 'Meu Perfil', user: req.session.user, clientProfile: res.locals.clientProfile });
});

router.get('/workouts', async (req, res) => {
    const workoutsRes = await db.query("SELECT * FROM workouts WHERE client_id = $1 ORDER BY created_at DESC", [res.locals.clientProfile.id]);
    res.render('pages/client-workouts', { title: 'Meus Treinos', user: req.session.user, workouts: workoutsRes.rows });
});

router.get('/workouts/:id', async (req, res) => {
    try {
        const workoutRes = await db.query("SELECT * FROM workouts WHERE id = $1 AND client_id = $2", [req.params.id, res.locals.clientProfile.id]);
        if (workoutRes.rows.length === 0) return res.redirect('/client/workouts');
        const exercisesRes = await db.query("SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC", [req.params.id]);
        res.render('pages/workout-details', { title: workoutRes.rows[0].title, user: req.session.user, workout: workoutRes.rows[0], exercises: exercisesRes.rows });
    } catch(e) { res.redirect('/client/workouts'); }
});

module.exports = router;
