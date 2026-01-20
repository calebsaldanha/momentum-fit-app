const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { createNotification } = require('../utils/notificationService');
const { sendPaymentPendingEmail } = require('../utils/emailService');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// === PROFILE (ANAMNESE) ===
router.get('/profile', async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Query Defensiva: Garante que busca phone/birth_date mesmo que users não tenha (embora o fix acima resolva)
        // Usa c.* para pegar tudo de clients
        const result = await db.query(`
            SELECT 
                u.name, u.email, 
                u.phone as user_phone, u.birth_date as user_birth_date,
                c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [userId]);
        
        let clientData = result.rows[0] || {};
        
        // Unificar dados (Users tem prioridade, depois Clients)
        clientData.phone = clientData.user_phone || clientData.phone || '';
        clientData.birth_date = clientData.user_birth_date || clientData.birth_date || null;
        clientData.name = clientData.name || req.session.user.name;
        clientData.email = clientData.email || req.session.user.email;

        // Normalização visual para o EJS não quebrar
        const stressMapRev = { 1: 'baixo', 2: 'medio', 3: 'alto' };
        clientData.stress_level_text = stressMapRev[clientData.stress_level] || 'baixo';
        
        // Campos que podem ser nulos e causar erro no value=""
        clientData.goal = clientData.fitness_goals || clientData.goal || '';
        clientData.weight = clientData.current_weight || clientData.weight || '';
        clientData.height = clientData.height || '';
        clientData.medical_history = clientData.medical_history || '';
        clientData.medications = clientData.medications || '';
        clientData.injuries = clientData.injuries || '';
        clientData.emergency_contact = clientData.emergency_contact || '';
        clientData.emergency_phone = clientData.emergency_phone || '';
        
        // Garante objeto JSON para medidas
        if (!clientData.body_measurements) clientData.body_measurements = {};

        res.render('pages/client-profile', { clientData });

    } catch (err) {
        console.error("ERRO CRÍTICO EM /client/profile:", err);
        // Em vez de quebrar, renderiza a página com dados vazios e um aviso no console
        res.render('pages/client-profile', { 
            clientData: { 
                name: req.session.user.name, 
                email: req.session.user.email,
                body_measurements: {} 
            },
            messages: { error: "Erro ao carregar dados. Tente salvar novamente." }
        });
    }
});

router.post('/profile', async (req, res) => {
    const data = req.body;
    try {
        await db.query('BEGIN');
        
        // Atualizar User
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);

        const stressMap = { 'baixo': 1, 'medio': 2, 'alto': 3 };
        const stressValue = stressMap[data.stress_level] || 1;

        const measurements = {
            chest: data.meas_chest, waist: data.meas_waist, hips: data.meas_hips,
            arms: data.meas_arms, thighs: data.meas_thighs
        };

        // Verifica se cliente existe
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        const params = [
            req.session.user.id, data.weight || 0, data.weight || 0, data.height || 0, 
            data.goal, data.goal,
            data.goal_description, data.training_experience, data.preferred_training_time,
            data.medical_history, data.medications, data.injuries, 
            data.emergency_contact, data.emergency_phone,
            data.sleep_quality, stressValue, data.water_intake, data.smoking_status,
            data.available_equipment, data.available_equipment, 
            data.daily_activity_level, data.daily_activity_level,
            data.alcohol_consumption, data.dietary_restrictions, 
            data.liked_exercises, data.disliked_exercises,
            JSON.stringify(measurements), data.phone, data.birth_date || null
        ];

        if(check.rows.length === 0) {
             await db.query(`INSERT INTO clients (
                user_id, weight, current_weight, height, goal, fitness_goals, 
                goal_description, training_experience, preferred_training_time, 
                medical_history, medications, injuries, emergency_contact, emergency_phone, 
                sleep_quality, stress_level, water_intake, smoking_status, 
                available_equipment, equipment, daily_activity_level, activity_level,
                alcohol_consumption, dietary_restrictions, liked_exercises, disliked_exercises, body_measurements,
                phone, birth_date
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`, 
               params);
        } else {
             await db.query(`UPDATE clients SET 
                weight=$2, current_weight=$3, height=$4, goal=$5, fitness_goals=$6, 
                goal_description=$7, training_experience=$8, preferred_training_time=$9, 
                medical_history=$10, medications=$11, injuries=$12, emergency_contact=$13, emergency_phone=$14, 
                sleep_quality=$15, stress_level=$16, water_intake=$17, smoking_status=$18, 
                available_equipment=$19, equipment=$20, daily_activity_level=$21, activity_level=$22,
                alcohol_consumption=$23, dietary_restrictions=$24, liked_exercises=$25, disliked_exercises=$26, body_measurements=$27,
                phone=$28, birth_date=$29
               WHERE user_id=$1`, 
               params);
        }

        await db.query('COMMIT');
        
        // Checar Plano para Redirecionamento
        const subRes = await db.query(`
            SELECT p.price, p.id as plan_id 
            FROM subscriptions s 
            JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 AND s.status = 'active'
            ORDER BY s.start_date DESC LIMIT 1
        `, [req.session.user.id]);

        if (subRes.rows.length > 0) {
            const plan = subRes.rows[0];
            if (parseFloat(plan.price) > 0) {
                // Verifica se já existe pagamento pendente ou pago para essa subscrição
                // Se não, manda pagar. Se sim, manda pro dashboard.
                req.flash('success', 'Perfil salvo! Realize o pagamento.');
                return res.redirect('/client/checkout/' + plan.plan_id);
            }
        }

        req.flash('success', 'Perfil atualizado com sucesso!');
        res.redirect('/client/dashboard');

    } catch(e) {
        await db.query('ROLLBACK');
        console.error("Erro ao salvar perfil:", e);
        req.flash('error', 'Erro ao salvar perfil: ' + e.message);
        res.redirect('/client/profile');
    }
});

// === CHECKOUT & FINANCEIRO ===
router.get('/checkout/:planId', async (req, res) => {
    try {
        const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [req.params.planId]);
        if (planResult.rows.length === 0) return res.redirect('/client/plans');
        const pixKey = '084dee93-9dc5-44e7-aa2e-3eff8623651d';
        res.render('pages/client-checkout', { plan: planResult.rows[0], pixKey: pixKey });
    } catch (e) { res.redirect('/client/plans'); }
});

router.post('/checkout', async (req, res) => {
    const { plan_id, due_day } = req.body;
    try {
        await db.query('BEGIN');

        const planRes = await db.query('SELECT name, price FROM plans WHERE id = $1', [plan_id]);
        const plan = planRes.rows[0];

        // Atualiza anterior para cancelada
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending_payment'", [req.session.user.id]);

        const startDate = new Date();
        const subRes = await db.query(`
            INSERT INTO subscriptions (user_id, plan_id, status, start_date, payment_due_day, auto_renew)
            VALUES ($1, $2, 'pending_payment', $3, $4, true)
            RETURNING id
        `, [req.session.user.id, plan_id, startDate, due_day]);

        const subscriptionId = subRes.rows[0].id;

        await db.query(`
            INSERT INTO payments (user_id, amount, status, payment_date, subscription_id, proof_url)
            VALUES ($1, $2, 'pending', NOW(), $3, 'pix_manual_verify')
        `, [req.session.user.id, plan.price, subscriptionId]);

        // NOTIFICAÇÕES COMPLETAS
        await createNotification(null, 'Novo Pagamento Pendente', `O usuário ${req.session.user.name} enviou um comprovante.`, '/admin/finance', 'alert');
        await createNotification(req.session.user.id, 'Pagamento em Análise', 'Recebemos seu comprovante. Aguarde aprovação.', '/client/financial', 'info');
        sendPaymentPendingEmail(req.session.user.email, req.session.user.name, plan.name).catch(e => console.error(e));

        await db.query('COMMIT');
        req.flash('success', 'Comprovante enviado! Aguarde a aprovação.');
        res.redirect('/client/financial');

    } catch (e) {
        await db.query('ROLLBACK');
        console.error("Erro checkout:", e);
        req.flash('error', 'Erro ao processar.');
        res.redirect('/client/plans');
    }
});

router.get('/financial', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const subRes = await db.query(`
            SELECT s.*, p.name as plan_name, p.price, p.features 
            FROM subscriptions s 
            JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment', 'past_due')
            ORDER BY s.start_date DESC LIMIT 1
        `, [userId]);

        const payRes = await db.query(`
            SELECT py.*, pl.name as plan_name 
            FROM payments py
            LEFT JOIN subscriptions s ON py.subscription_id = s.id
            LEFT JOIN plans pl ON s.plan_id = pl.id
            WHERE py.user_id = $1
            ORDER BY py.created_at DESC
        `, [userId]);

        res.render('pages/client-financial', { subscription: subRes.rows[0] || null, payments: payRes.rows });
    } catch (err) { res.redirect('/client/dashboard'); }
});

// Outras rotas (Settings, Dashboard, etc)
router.get('/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]);
        res.render('pages/client-settings', { settingsUser: result.rows[0] });
    } catch (e) { res.redirect('/client/dashboard'); }
});

router.post('/settings', async (req, res) => {
    const { email, current_password, new_password, confirm_password } = req.body;
    try {
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const user = userRes.rows[0];
        
        if (new_password) {
            if (!current_password || new_password !== confirm_password) throw new Error('Confirmação incorreta.');
            if (new_password.length < 6) throw new Error('Nova senha muito curta.');
            if (!await bcrypt.compare(current_password, user.password)) throw new Error('Senha atual incorreta.');
            const hash = await bcrypt.hash(new_password, 10);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
            await createNotification(user.id, 'Segurança', 'Sua senha foi alterada.', '/client/settings');
        }
        if (email && email !== user.email) {
             if (!current_password || !await bcrypt.compare(current_password, user.password)) throw new Error('Senha necessária.');
             await db.query('UPDATE users SET email = $1 WHERE id = $2', [email, user.id]);
        }
        req.flash('success', 'Dados atualizados.');
    } catch (error) { req.flash('error', error.message); }
    res.redirect('/client/settings');
});

router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: {} }));
router.get('/plans', async (req, res) => {
    try {
        const plans = await db.query("SELECT * FROM plans WHERE is_active = true ORDER BY price ASC");
        res.render('pages/client-plans', { plans: plans.rows });
    } catch(e) { res.render('pages/client-plans', { plans: [] }); }
});
router.get('/content', (req, res) => res.render('pages/client-content', { articles: [] }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.get('/workouts', (req, res) => res.render('pages/client-workouts', { workouts: [] }));
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { history: [] }));

module.exports = router;
