const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getChatResponse } = require('../utils/aiService');

function isClient(req, res, next) {
    if (req.session.user && (req.session.user.role === 'client')) return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// Dashboard
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } }));

// --- PERFIL BLINDADO ---
router.get('/profile', async (req, res) => {
    try {
        // Selecionamos colunas manualmente para evitar conflito de ID e garantir que 'client' nunca seja null
        const result = await db.query(`
            SELECT 
                u.name, u.email, u.phone, u.birth_date,
                c.weight, c.height, c.goal, c.goal_description,
                c.training_experience, c.preferred_training_time,
                c.medical_history, c.medications, c.injuries, c.limitations,
                c.sleep_quality, c.stress_level, c.water_intake, 
                c.nutrition_type, c.alcohol_consumption, c.smoking_status,
                c.available_equipment, c.emergency_contact, c.emergency_phone
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        // Garante que clientData existe mesmo se o JOIN falhar (usuário novo)
        const clientData = result.rows[0] || { 
            name: req.session.user.name, 
            email: req.session.user.email 
        };

        // Objeto dummy para evitar quebra se a view antiga for carregada
        const subscription = { plan: 'Loading...', price: '0.00', status: 'active' };

        res.render('pages/client-profile', { 
            client: clientData, 
            subscription: subscription,
            messages: {} // Garante que messages existe
        });

    } catch (err) {
        console.error("ERRO CRÍTICO NO PERFIL:", err);
        // Em vez de crashar, renderiza o dashboard com aviso
        req.flash('error', 'Erro ao carregar perfil. Tente novamente.');
        res.redirect('/client/dashboard');
    }
});

// POST Salvar Perfil
router.post('/profile', async (req, res) => {
    const data = req.body;
    try {
        await db.query('BEGIN');
        
        // 1. Atualiza Users
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);
        
        // 2. Verifica se cliente existe
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        if(check.rows.length === 0) {
            // INSERT
            await db.query(`
                INSERT INTO clients (
                    user_id, weight, height, goal, goal_description,
                    training_experience, preferred_training_time,
                    medical_history, medications, injuries, limitations,
                    sleep_quality, stress_level, water_intake,
                    nutrition_type, alcohol_consumption, smoking_status,
                    available_equipment, emergency_contact, emergency_phone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
                [req.session.user.id, data.weight, data.height, data.goal, data.goal_description,
                 data.training_experience, data.preferred_training_time,
                 data.medical_history, data.medications, data.injuries, data.limitations,
                 data.sleep_quality, data.stress_level, data.water_intake,
                 data.nutrition_type, data.alcohol_consumption, data.smoking_status,
                 data.available_equipment, data.emergency_contact, data.emergency_phone]
            );
        } else {
            // UPDATE
            await db.query(`
                UPDATE clients SET 
                    weight=$1, height=$2, goal=$3, goal_description=$4,
                    training_experience=$5, preferred_training_time=$6,
                    medical_history=$7, medications=$8, injuries=$9, limitations=$10,
                    sleep_quality=$11, stress_level=$12, water_intake=$13,
                    nutrition_type=$14, alcohol_consumption=$15, smoking_status=$16,
                    available_equipment=$17, emergency_contact=$18, emergency_phone=$19
                WHERE user_id=$20`,
                [data.weight, data.height, data.goal, data.goal_description,
                 data.training_experience, data.preferred_training_time,
                 data.medical_history, data.medications, data.injuries, data.limitations,
                 data.sleep_quality, data.stress_level, data.water_intake,
                 data.nutrition_type, data.alcohol_consumption, data.smoking_status,
                 data.available_equipment, data.emergency_contact, data.emergency_phone,
                 req.session.user.id]
            );
        }

        await db.query('COMMIT');

        // Lógica de Redirecionamento (Anamnese -> Financeiro)
        const sub = await db.query("SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [req.session.user.id]);
        if (sub.rows.length > 0 && sub.rows[0].price > 0 && sub.rows[0].status === 'pending') {
            req.flash('success', 'Ficha salva! Agora finalize seu pagamento.');
            return res.redirect('/client/financial');
        }

        req.flash('success', 'Dados atualizados com sucesso!');
        res.redirect('/client/dashboard');

    } catch(e) {
        await db.query('ROLLBACK');
        console.error("Erro ao salvar:", e);
        req.flash('error', 'Erro ao salvar dados.');
        res.redirect('/client/profile');
    }
});

// Outras rotas
router.get('/financial', async (req, res) => {
    try {
        const subRes = await db.query("SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [req.session.user.id]);
        const sub = subRes.rows[0] || { plan_name: 'Free', price: 0, status: 'active', payment_due_day: 10 };
        const pixKey = '084dee93-9dc5-44e7-aa2e-3eff8623651d';
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}`;
        res.render('pages/client-financial', { subscription: sub, pixKey, qrCodeUrl });
    } catch(e) { res.redirect('/client/dashboard'); }
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution', { history: [] }));
router.get('/settings', (req, res) => res.render('pages/client-settings'));
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

module.exports = router;
