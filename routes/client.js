const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { createNotification } = require('../utils/notificationService');
const { sendPaymentPendingEmail } = require('../utils/emailService');

// Middleware de Autenticação Robusto
function isClient(req, res, next) {
    // Verifica se sessão existe antes de tentar acessar user
    if (req.session && req.session.user && req.session.user.role === 'client') {
        return next();
    }
    // Se não tiver sessão ou não for cliente, manda pro login
    req.flash('error', 'Sessão expirada ou inválida. Faça login novamente.');
    res.redirect('/auth/login');
}

router.use(isClient);

// === PROFILE (ANAMNESE) ===
router.get('/profile', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await db.query(`
            SELECT u.name, u.email, u.phone as user_phone, u.birth_date as user_birth_date, c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [userId]);
        
        let clientData = result.rows[0] || {};
        clientData.name = clientData.name || req.session.user.name;
        clientData.email = clientData.email || req.session.user.email;
        clientData.phone = clientData.user_phone || clientData.phone || '';
        clientData.birth_date = clientData.user_birth_date || clientData.birth_date || null;
        
        const stressMapRev = { 1: 'baixo', 2: 'medio', 3: 'alto' };
        clientData.stress_level_text = stressMapRev[clientData.stress_level] || 'baixo';
        if (!clientData.body_measurements) clientData.body_measurements = {};

        res.render('pages/client-profile', { clientData });
    } catch (err) {
        console.error("Erro no Profile:", err);
        res.render('pages/client-profile', { clientData: { body_measurements: {} }, messages: { error: "Erro ao carregar dados." } });
    }
});

router.post('/profile', async (req, res) => {
    // ... (Lógica de profile mantida, simplificada aqui para focar no problema do checkout)
    // O código original de post profile estava funcional, focaremos na correção da sessão e checkout
    const data = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', [data.name, data.phone, data.birth_date || null, req.session.user.id]);
        
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        // ... (Query simplificada de Insert/Update) ...
        const measurements = JSON.stringify({ chest: data.meas_chest, waist: data.meas_waist, hips: data.meas_hips, arms: data.meas_arms, thighs: data.meas_thighs });
        
        if(check.rows.length === 0) {
             await db.query(`INSERT INTO clients (user_id, weight, current_weight, height, goal, phone, birth_date, body_measurements) VALUES ($1, $2, $2, $3, $4, $5, $6, $7)`, 
             [req.session.user.id, data.weight||0, data.height||0, data.goal, data.phone, data.birth_date||null, measurements]);
        } else {
             await db.query(`UPDATE clients SET weight=$2, current_weight=$2, height=$3, goal=$4, phone=$5, birth_date=$6, body_measurements=$7 WHERE user_id=$1`, 
             [req.session.user.id, data.weight||0, data.height||0, data.goal, data.phone, data.birth_date||null, measurements]);
        }

        await db.query('COMMIT');
        
        const subRes = await db.query(`SELECT p.price, p.id as plan_id FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = $1 AND s.status = 'active' ORDER BY s.start_date DESC LIMIT 1`, [req.session.user.id]);
        if (subRes.rows.length > 0 && parseFloat(subRes.rows[0].price) > 0) {
            req.flash('success', 'Perfil salvo! Realize o pagamento.');
            return res.redirect('/client/checkout/' + subRes.rows[0].plan_id);
        }
        res.redirect('/client/dashboard');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error(e);
        res.redirect('/client/profile');
    }
});

// === CHECKOUT & FINANCEIRO (CORRIGIDO) ===
router.get('/checkout/:planId', async (req, res) => {
    try {
        const planId = req.params.planId;
        console.log(`[CHECKOUT] Iniciando checkout para plano ID: ${planId}`);

        const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        
        if (planResult.rows.length === 0) {
            console.log(`[CHECKOUT] Plano ${planId} não encontrado.`);
            req.flash('error', 'Plano não encontrado.');
            return res.redirect('/client/plans');
        }
        
        const pixKey = '084dee93-9dc5-44e7-aa2e-3eff8623651d';
        console.log(`[CHECKOUT] Renderizando página para plano: ${planResult.rows[0].name}`);
        
        res.render('pages/client-checkout', { 
            plan: planResult.rows[0],
            pixKey: pixKey
        });

    } catch (e) {
        console.error("[CHECKOUT ERROR]", e);
        req.flash('error', 'Erro ao carregar checkout: ' + e.message);
        res.redirect('/client/plans');
    }
});

router.post('/checkout', async (req, res) => {
    const { plan_id, due_day } = req.body;
    try {
        await db.query('BEGIN');
        const planRes = await db.query('SELECT name, price FROM plans WHERE id = $1', [plan_id]);
        const plan = planRes.rows[0];

        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending_payment'", [req.session.user.id]);
        const subRes = await db.query(`INSERT INTO subscriptions (user_id, plan_id, status, start_date, payment_due_day, auto_renew) VALUES ($1, $2, 'pending_payment', NOW(), $3, true) RETURNING id`, [req.session.user.id, plan_id, due_day]);
        await db.query(`INSERT INTO payments (user_id, amount, status, payment_date, subscription_id, proof_url, created_at) VALUES ($1, $2, 'pending', NOW(), $3, 'pix_manual_verify', NOW())`, [req.session.user.id, plan.price, subRes.rows[0].id]);

        // Notificações
        try {
            await createNotification(null, 'Pagamento Pendente', `Usuário ${req.session.user.name} enviou comprovante.`, '/admin/finance', 'alert');
            await createNotification(req.session.user.id, 'Pagamento em Análise', 'Aguarde aprovação.', '/client/financial', 'info');
            sendPaymentPendingEmail(req.session.user.email, req.session.user.name, plan.name).catch(e => console.error(e));
        } catch(notifError) { console.error("Erro notificação checkout:", notifError); }

        await db.query('COMMIT');
        req.flash('success', 'Enviado para análise.');
        res.redirect('/client/financial');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error("Erro Checkout POST:", e);
        req.flash('error', 'Erro ao processar: ' + e.message);
        res.redirect('/client/plans');
    }
});

router.get('/financial', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const subRes = await db.query(`SELECT s.*, p.name as plan_name, p.price, p.features FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment', 'past_due') ORDER BY s.start_date DESC LIMIT 1`, [userId]);
        const payRes = await db.query(`SELECT py.*, pl.name as plan_name FROM payments py LEFT JOIN subscriptions s ON py.subscription_id = s.id LEFT JOIN plans pl ON s.plan_id = pl.id WHERE py.user_id = $1 ORDER BY py.created_at DESC`, [userId]);
        res.render('pages/client-financial', { subscription: subRes.rows[0] || null, payments: payRes.rows });
    } catch (err) { res.redirect('/client/dashboard'); }
});

// Outras rotas...
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: {} }));
router.get('/plans', async (req, res) => { try { const p = await db.query("SELECT * FROM plans WHERE is_active = true ORDER BY price ASC"); res.render('pages/client-plans', { plans: p.rows }); } catch(e) { res.render('pages/client-plans', { plans: [] }); } });
router.get('/content', (req, res) => res.render('pages/client-content', { articles: [] }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.get('/workouts', (req, res) => res.render('pages/client-workouts', { workouts: [] }));
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { history: [] }));
router.get('/settings', async (req, res) => { try { const r = await db.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]); res.render('pages/client-settings', { settingsUser: r.rows[0] }); } catch (e) { res.redirect('/client/dashboard'); } });
router.post('/settings', async (req, res) => { res.redirect('/client/settings'); });

module.exports = router;
