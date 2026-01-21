const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { createNotification } = require('../utils/notificationService');
const { sendPaymentPendingEmail } = require('../utils/emailService');

// Middleware de Autenticação
function isClient(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'client') {
        return next();
    }
    req.flash('error', 'Sessão expirada. Faça login novamente.');
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
        // Fallbacks para garantir que campos existam
        clientData.name = clientData.name || req.session.user.name;
        clientData.email = clientData.email || req.session.user.email;
        clientData.phone = clientData.user_phone || clientData.phone || '';
        if (!clientData.body_measurements) clientData.body_measurements = {};

        res.render('pages/client-profile', { clientData });
    } catch (err) {
        console.error("Erro GET Profile:", err);
        res.render('pages/client-profile', { clientData: { body_measurements: {} }, messages: { error: "Erro ao carregar dados." } });
    }
});

router.post('/profile', async (req, res) => {
    const data = req.body;
    try {
        await db.query('BEGIN');
        
        // 1. Atualiza Tabela Users
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);

        // 2. Prepara dados Clients
        const measurements = JSON.stringify({ 
            chest: data.meas_chest, waist: data.meas_waist, hips: data.meas_hips, 
            arms: data.meas_arms, thighs: data.meas_thighs 
        });

        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        const clientParams = [
            req.session.user.id, data.weight||0, data.weight||0, data.height||0, data.goal, 
            data.phone, data.birth_date||null, measurements,
            data.goal_description || '', data.training_experience || '', data.preferred_training_time || '',
            data.medical_history || '', data.medications || '', data.injuries || '',
            data.emergency_contact || '', data.emergency_phone || ''
        ];

        // 3. Upsert Client
        if(check.rows.length === 0) {
             await db.query(`
                INSERT INTO clients (
                    user_id, weight, current_weight, height, goal, phone, birth_date, body_measurements,
                    goal_description, training_experience, preferred_training_time,
                    medical_history, medications, injuries, emergency_contact, emergency_phone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             `, clientParams);
        } else {
             await db.query(`
                UPDATE clients SET 
                    weight=$2, current_weight=$3, height=$4, goal=$5, phone=$6, birth_date=$7, body_measurements=$8,
                    goal_description=$9, training_experience=$10, preferred_training_time=$11,
                    medical_history=$12, medications=$13, injuries=$14, emergency_contact=$15, emergency_phone=$16
                WHERE user_id=$1
             `, clientParams);
        }

        await db.query('COMMIT');
        
        // === LÓGICA DE REDIRECIONAMENTO CORRIGIDA ===
        // Verifica se já existe assinatura ATIVA ou PENDENTE
        const subRes = await db.query(`
            SELECT s.id, s.status, s.plan_id 
            FROM subscriptions s 
            WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment')
            ORDER BY s.start_date DESC LIMIT 1
        `, [req.session.user.id]);

        if (subRes.rows.length > 0) {
            const sub = subRes.rows[0];
            
            // Se já está ativo, apenas volta pro dashboard (edição de perfil)
            if (sub.status === 'active') {
                req.flash('success', 'Perfil atualizado com sucesso!');
                return res.redirect('/client/dashboard');
            }
            
            // Se está pendente, manda pagar
            if (sub.status === 'pending_payment') {
                req.flash('success', 'Perfil salvo! Realize o pagamento para ativar.');
                return res.redirect(`/client/checkout/${sub.plan_id}`);
            }
        }

        // Se não tem assinatura nenhuma, manda escolher plano (ou checkout se tiver vindo de fluxo de compra)
        req.flash('success', 'Perfil salvo! Escolha um plano para continuar.');
        res.redirect('/client/plans');

    } catch(e) {
        await db.query('ROLLBACK');
        console.error("Erro POST Profile:", e);
        req.flash('error', 'Erro ao salvar perfil.');
        res.redirect('/client/profile');
    }
});

// === CHECKOUT & FINANCEIRO (Mantidos e Ajustados) ===
router.get('/checkout/:planId', async (req, res) => {
    try {
        const planId = req.params.planId;
        const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
        if (planResult.rows.length === 0) return res.redirect('/client/plans');

        const plan = planResult.rows[0];
        const allPlans = await db.query('SELECT id, name, price FROM plans WHERE is_active = true ORDER BY price ASC');
        
        // Pix estático para exemplo (Em produção seria dinâmico via API)
        const pixKey = '084dee93-9dc5-44e7-aa2e-3eff8623651d'; 
        
        res.render('pages/client-checkout', { 
            plan: plan,
            allPlans: allPlans.rows,
            pixKey: pixKey,
            pixPayload: null // Payload gerado no front ou backend específico
        });
    } catch (e) {
        console.error(e);
        res.redirect('/client/plans');
    }
});

router.post('/checkout', async (req, res) => {
    const { plan_id, due_day } = req.body;
    try {
        await db.query('BEGIN');
        
        // Cancela assinaturas pendentes anteriores para não duplicar
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending_payment'", [req.session.user.id]);

        const planRes = await db.query('SELECT name, price FROM plans WHERE id = $1', [plan_id]);
        const plan = planRes.rows[0];
        const price = parseFloat(plan.price);
        const status = price === 0 ? 'active' : 'pending_payment';

        // Cria nova assinatura
        const subRes = await db.query(`
            INSERT INTO subscriptions (user_id, plan_id, status, start_date, payment_due_day, auto_renew) 
            VALUES ($1, $2, $3, NOW(), $4, true) 
            RETURNING id`, 
            [req.session.user.id, plan_id, status, due_day || 10]
        );
        
        if (price > 0) {
            await db.query(`
                INSERT INTO payments (user_id, amount, status, payment_date, subscription_id, proof_url) 
                VALUES ($1, $2, 'pending', NOW(), $3, 'pix_manual_verify')`, 
                [req.session.user.id, price, subRes.rows[0].id]
            );
            
            // Notificações
            await createNotification(null, 'Novo Pagamento Pendente', `Cliente ${req.session.user.name} aguarda aprovação.`, '/admin/finance', 'alert');
            await createNotification(req.session.user.id, 'Pagamento em Análise', 'Seu pagamento está sendo verificado.', '/client/financial', 'info');
        } else {
             await createNotification(req.session.user.id, 'Plano Gratuito', 'Plano ativado com sucesso.', '/client/dashboard', 'success');
        }

        await db.query('COMMIT');
        
        if (price > 0) {
            req.flash('success', 'Pagamento registrado! Aguarde aprovação.');
            res.redirect('/client/financial');
        } else {
            req.flash('success', 'Plano ativado!');
            res.redirect('/client/dashboard');
        }
    } catch (e) {
        await db.query('ROLLBACK');
        console.error(e);
        req.flash('error', 'Erro no checkout.');
        res.redirect('/client/plans');
    }
});

// Outras rotas (Dashboard, Financial, etc)
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: {} }));
router.get('/financial', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const subRes = await db.query(`SELECT s.*, p.name as plan_name, p.price FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment', 'past_due') ORDER BY s.start_date DESC LIMIT 1`, [userId]);
        const payRes = await db.query(`SELECT py.*, pl.name as plan_name FROM payments py LEFT JOIN subscriptions s ON py.subscription_id = s.id LEFT JOIN plans pl ON s.plan_id = pl.id WHERE py.user_id = $1 ORDER BY py.created_at DESC`, [userId]);
        res.render('pages/client-financial', { subscription: subRes.rows[0] || null, payments: payRes.rows });
    } catch (err) { res.render('pages/client-financial', { subscription: null, payments: [] }); }
});

router.get('/plans', async (req, res) => { try { const p = await db.query("SELECT * FROM plans WHERE is_active = true ORDER BY price ASC"); res.render('pages/client-plans', { plans: p.rows }); } catch(e) { res.render('pages/client-plans', { plans: [] }); } });
router.get('/content', (req, res) => res.render('pages/client-content', { articles: [] }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.get('/workouts', (req, res) => res.render('pages/client-workouts', { workouts: [] }));
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { history: [] }));
router.get('/settings', async (req, res) => { try { const r = await db.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]); res.render('pages/client-settings', { settingsUser: r.rows[0] }); } catch (e) { res.redirect('/client/dashboard'); } });

module.exports = router;
