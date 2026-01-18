const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getChatResponse } = require('../utils/aiService');

function isClient(req, res, next) {
    if (req.session.user && (req.session.user.role === 'client')) return next();
    res.redirect('/auth/login');
}

router.use(isClient);

router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } }));
router.get('/workouts', async (req, res) => {
    try {
        const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/client-workouts', { workouts: workouts.rows });
    } catch(e) { res.render('pages/client-workouts', { workouts: [] }); }
});
router.get('/plans', async (req, res) => {
    try { const plans = await db.query("SELECT * FROM plans ORDER BY price ASC"); res.render('pages/client-plans', { plans: plans.rows }); }
    catch(e) { res.render('pages/client-plans', { plans: [] }); }
});
router.get('/content', async (req, res) => {
    try { const articles = await db.query("SELECT * FROM articles WHERE status = 'published'"); res.render('pages/client-content', { articles: articles.rows }); }
    catch(e) { res.render('pages/client-content', { articles: [] }); }
});
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.post('/ai-coach/message', async (req, res) => {
    const response = await getChatResponse(req.session.user.id, req.body.message);
    res.json({ response });
});

// GET PERFIL
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date,
                   c.weight, c.height, c.goal, c.medical_history, 
                   c.medications, c.injuries, c.limitations, c.activity_level, 
                   c.available_equipment, c.goal_description,
                   c.sleep_quality, c.stress_level, c.water_intake, c.nutrition_type, c.training_days_goal
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        const planPrice = '10.00';
        const subscription = { 
            plan: 'Momentum Básico', 
            status: 'Pendente', 
            price: planPrice,
            pixKey: '084dee93-9dc5-44e7-aa2e-3eff8623651d',
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020126360014BR.GOV.BCB.PIX0114084dee93-9dc5-44e7-aa2e-3eff8623651d520400005303986540510005802BR5912MomentumFit6009SaoPaulo62070503***6304`
        };

        res.render('pages/client-profile', { client: result.rows[0] || {}, subscription });
    } catch (err) {
        res.redirect('/client/dashboard');
    }
});

// POST PERFIL (SALVANDO TUDO)
router.post('/profile', async (req, res) => {
    const { 
        name, phone, birth_date,
        weight, height, goal, goal_description,
        activity_level, available_equipment,
        medical_history, medications, injuries, limitations,
        sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal
    } = req.body;

    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', [name, phone, birth_date || null, req.session.user.id]);
        
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        if(check.rows.length === 0) {
            await db.query(`INSERT INTO clients (user_id, weight, height, goal, goal_description, activity_level, available_equipment, medical_history, medications, injuries, limitations, sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [req.session.user.id, weight, height, goal, goal_description, activity_level, available_equipment, medical_history, medications, injuries, limitations, sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal]);
        } else {
            await db.query(`UPDATE clients SET weight=$1, height=$2, goal=$3, goal_description=$4, activity_level=$5, available_equipment=$6, medical_history=$7, medications=$8, injuries=$9, limitations=$10, sleep_quality=$11, stress_level=$12, water_intake=$13, nutrition_type=$14, training_days_goal=$15 WHERE user_id=$16`,
                [weight, height, goal, goal_description, activity_level, available_equipment, medical_history, medications, injuries, limitations, sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal, req.session.user.id]);
        }
        await db.query('COMMIT');
        req.flash('success', 'Perfil salvo!');
    } catch(e) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao salvar.');
    }
    res.redirect('/client/profile');
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution'));
router.get('/settings', (req, res) => res.render('pages/client-settings'));
module.exports = router;
