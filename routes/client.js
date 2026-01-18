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
        const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1 ORDER BY created_at DESC", [req.session.user.id]);
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
                   c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        // Mock de assinatura
        const subscription = { 
            plan: 'Momentum Básico', 
            status: 'Pendente', 
            price: '10.00',
            pixKey: '084dee93-9dc5-44e7-aa2e-3eff8623651d',
            qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=pix-mock'
        };

        res.render('pages/client-profile', { client: result.rows[0] || {}, subscription });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

// POST PERFIL (SALVAR TUDO)
router.post('/profile', async (req, res) => {
    const { 
        name, phone, birth_date,
        weight, height, goal, goal_description,
        activity_level, available_equipment,
        medical_history, medications, injuries, limitations,
        sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal,
        alcohol_consumption, smoking_status, training_experience, preferred_training_time,
        emergency_contact, emergency_phone
    } = req.body;

    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [name, phone, birth_date || null, req.session.user.id]);
        
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        if(check.rows.length === 0) {
            // INSERT GIGANTE
            await db.query(`
                INSERT INTO clients (
                    user_id, weight, height, goal, goal_description,
                    activity_level, available_equipment,
                    medical_history, medications, injuries, limitations,
                    sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal,
                    alcohol_consumption, smoking_status, training_experience, preferred_training_time,
                    emergency_contact, emergency_phone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                [req.session.user.id, weight, height, goal, goal_description, activity_level, available_equipment, medical_history, medications, injuries, limitations, sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal, alcohol_consumption, smoking_status, training_experience, preferred_training_time, emergency_contact, emergency_phone]);
        } else {
            // UPDATE GIGANTE
            await db.query(`
                UPDATE clients SET 
                    weight=$1, height=$2, goal=$3, goal_description=$4,
                    activity_level=$5, available_equipment=$6,
                    medical_history=$7, medications=$8, injuries=$9, limitations=$10,
                    sleep_quality=$11, stress_level=$12, water_intake=$13, nutrition_type=$14, training_days_goal=$15,
                    alcohol_consumption=$16, smoking_status=$17, training_experience=$18, preferred_training_time=$19,
                    emergency_contact=$20, emergency_phone=$21
                WHERE user_id=$22`,
                [weight, height, goal, goal_description, activity_level, available_equipment, medical_history, medications, injuries, limitations, sleep_quality, stress_level, water_intake, nutrition_type, training_days_goal, alcohol_consumption, smoking_status, training_experience, preferred_training_time, emergency_contact, emergency_phone, req.session.user.id]);
        }

        await db.query('COMMIT');
        req.flash('success', 'Ficha atualizada com sucesso!');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error(e);
        req.flash('error', 'Erro ao salvar perfil.');
    }
    res.redirect('/client/profile');
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution'));
router.get('/settings', (req, res) => res.render('pages/client-settings'));

module.exports = router;
