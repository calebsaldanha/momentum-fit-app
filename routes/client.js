const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getChatResponse } = require('../utils/aiService');

function isClient(req, res, next) {
    if (req.session.user && (req.session.user.role === 'client')) return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// --- DASHBOARD ---
router.get('/dashboard', (req, res) => {
    // Dados mockados para evitar erro se não tiver histórico
    res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } });
});

// --- PERFIL (COM TRATAMENTO DE ERRO ROBUSTO) ---
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date, c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        // Se não achou usuário (impossível se logado, mas por segurança)
        if (result.rows.length === 0) return res.redirect('/auth/logout');

        const clientData = result.rows[0];

        // Mock de assinatura
        const subscription = { 
            plan: 'Momentum Básico', 
            status: 'Pendente', 
            price: '10.00',
            pixKey: '084dee93-9dc5-44e7-aa2e-3eff8623651d',
            qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=pix-mock'
        };

        res.render('pages/client-profile', { client: clientData, subscription });
    } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        res.redirect('/client/dashboard');
    }
});

router.post('/profile', async (req, res) => {
    // Recebe tudo do form
    const data = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);
        
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        if(check.rows.length === 0) {
            await db.query(`INSERT INTO clients (user_id, weight, height, goal, training_experience, medical_history) VALUES ($1, $2, $3, $4, $5, $6)`,
                [req.session.user.id, data.weight, data.height, data.goal, data.training_experience, data.medical_history]);
        } else {
            // Update genérico dos campos principais
            await db.query(`
                UPDATE clients SET 
                weight=$1, height=$2, goal=$3, goal_description=$4, 
                activity_level=$5, available_equipment=$6, medical_history=$7, 
                medications=$8, injuries=$9, limitations=$10,
                sleep_quality=$11, stress_level=$12, water_intake=$13, 
                nutrition_type=$14, training_days_goal=$15, emergency_contact=$16, emergency_phone=$17
                WHERE user_id=$18`,
                [data.weight, data.height, data.goal, data.goal_description, 
                 data.activity_level, data.available_equipment, data.medical_history,
                 data.medications, data.injuries, data.limitations,
                 data.sleep_quality, data.stress_level, data.water_intake,
                 data.nutrition_type, data.training_days_goal, data.emergency_contact, data.emergency_phone,
                 req.session.user.id]
            );
        }
        await db.query('COMMIT');
        req.flash('success', 'Perfil salvo.');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error(e);
        req.flash('error', 'Erro ao salvar.');
    }
    res.redirect('/client/profile');
});

// --- EVOLUÇÃO (DADOS MOCKADOS SE VAZIO) ---
router.get('/evolution', async (req, res) => {
    // Futuramente buscaria histórico de peso/medidas
    const history = []; 
    res.render('pages/client-evolution', { history });
});

// --- CONFIGURAÇÕES ---
router.get('/settings', (req, res) => {
    res.render('pages/client-settings');
});

// --- OUTROS ---
router.get('/workouts', async (req, res) => {
    try {
        const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/client-workouts', { workouts: workouts.rows });
    } catch(e) { res.render('pages/client-workouts', { workouts: [] }); }
});

router.get('/financial', (req, res) => {
    // Mock simples para garantir carregamento
    res.render('pages/client-financial', { 
        subscription: { plan_name: 'Básico', price: 10.00, status: 'Pendente', payment_due_day: 10 },
        pixKey: '084dee93...', qrCodeUrl: '' 
    });
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

module.exports = router;
