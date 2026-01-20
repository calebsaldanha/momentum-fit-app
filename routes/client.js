const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// === PROFILE ===
router.get('/profile', async (req, res) => {
    try {
        // Query ajustada para garantir que pegamos os dados preenchidos
        const result = await db.query(`
            SELECT 
                u.name, u.email, 
                COALESCE(NULLIF(u.phone, ''), c.phone) as phone, 
                COALESCE(u.birth_date, c.birth_date) as birth_date,
                c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        const clientData = result.rows[0] || {};
        
        // Normalização visual
        const stressMapRev = { 1: 'baixo', 2: 'medio', 3: 'alto' };
        clientData.stress_level_text = stressMapRev[clientData.stress_level] || 'baixo';
        clientData.goal = clientData.fitness_goals || clientData.goal;
        clientData.weight = clientData.current_weight || clientData.weight;
        if (!clientData.body_measurements) clientData.body_measurements = {};

        res.render('pages/client-profile', { clientData });
    } catch (err) {
        console.error("Erro Client Profile:", err);
        res.redirect('/client/dashboard');
    }
});

router.post('/profile', async (req, res) => {
    const data = req.body;
    try {
        await db.query('BEGIN');
        
        // 1. Atualizar Tabela USERS
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);

        // Mapeamento de Inteiros
        const stressMap = { 'baixo': 1, 'medio': 2, 'alto': 3 };
        const stressValue = stressMap[data.stress_level] || 1;

        const measurements = {
            chest: data.meas_chest, waist: data.meas_waist, hips: data.meas_hips,
            arms: data.meas_arms, thighs: data.meas_thighs
        };

        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        // IMPORTANTE: Adicionado phone e birth_date na tabela CLIENTS também para manter consistência
        const params = [
            req.session.user.id,                    // $1
            data.weight,                            // $2
            data.weight,                            // $3 (current_weight)
            data.height,                            // $4
            data.goal,                              // $5
            data.goal,                              // $6 (fitness_goals)
            data.goal_description,                  // $7
            data.training_experience,               // $8
            data.preferred_training_time,           // $9
            data.medical_history,                   // $10
            data.medications,                       // $11
            data.injuries,                          // $12
            data.emergency_contact,                 // $13
            data.emergency_phone,                   // $14
            data.sleep_quality,                     // $15
            stressValue,                            // $16
            data.water_intake,                      // $17
            data.smoking_status,                    // $18
            data.available_equipment,               // $19
            data.available_equipment,               // $20 (equipment)
            data.daily_activity_level,              // $21
            data.daily_activity_level,              // $22 (activity_level)
            data.alcohol_consumption,               // $23
            data.dietary_restrictions,              // $24
            data.liked_exercises,                   // $25
            data.disliked_exercises,                // $26
            JSON.stringify(measurements),           // $27
            data.phone,                             // $28 (NOVO)
            data.birth_date || null                 // $29 (NOVO)
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
        req.flash('success', 'Perfil salvo com sucesso!');
        res.redirect('/client/profile');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error("Erro ao salvar perfil:", e);
        req.flash('error', 'Erro ao salvar perfil.');
        res.redirect('/client/profile');
    }
});

// === CHECKOUT & FINANCEIRO ===
router.get('/checkout/:planId', async (req, res) => {
    try {
        const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [req.params.planId]);
        if (planResult.rows.length === 0) return res.redirect('/client/plans');
        res.render('pages/client-checkout', { plan: planResult.rows[0] });
    } catch (e) {
        res.redirect('/client/plans');
    }
});

router.post('/checkout', async (req, res) => {
    const { plan_id, due_day } = req.body;
    try {
        await db.query('BEGIN');

        // Buscar preço
        const planRes = await db.query('SELECT price FROM plans WHERE id = $1', [plan_id]);
        const price = planRes.rows[0].price;

        // Cancelar assinaturas anteriores
        await db.query("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1", [req.session.user.id]);

        // Criar Assinatura (Status PENDENTE, aguardando admin)
        const startDate = new Date();
        const subRes = await db.query(`
            INSERT INTO subscriptions (user_id, plan_id, status, start_date, payment_due_day, auto_renew)
            VALUES ($1, $2, 'pending_payment', $3, $4, true)
            RETURNING id
        `, [req.session.user.id, plan_id, startDate, due_day]);

        const subscriptionId = subRes.rows[0].id;

        // Criar Pagamento (Status PENDENTE)
        await db.query(`
            INSERT INTO payments (user_id, amount, status, payment_date, subscription_id, proof_url)
            VALUES ($1, $2, 'pending', NOW(), $3, 'pix_manual_verify')
        `, [req.session.user.id, price, subscriptionId]);

        await db.query('COMMIT');
        req.flash('success', 'Solicitação enviada! Aguarde a aprovação do pagamento.');
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
        
        // Busca assinatura (Ativa OU Pendente)
        const subRes = await db.query(`
            SELECT s.*, p.name as plan_name, p.price, p.features 
            FROM subscriptions s 
            JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 AND s.status IN ('active', 'pending_payment')
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

        res.render('pages/client-financial', { 
            subscription: subRes.rows[0] || null,
            payments: payRes.rows
        });
    } catch (err) {
        res.redirect('/client/dashboard');
    }
});

// Settings e Outros
router.get('/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]);
        res.render('pages/client-settings', { settingsUser: result.rows[0] });
    } catch (e) { res.redirect('/client/dashboard'); }
});

router.post('/settings', async (req, res) => {
    // Mesma lógica anterior de senha/email...
    const { email, current_password, new_password, confirm_password } = req.body;
    try {
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const user = userRes.rows[0];
        if (new_password) {
            if (!current_password || new_password !== confirm_password) throw new Error('Erro na senha.');
            if (!await bcrypt.compare(current_password, user.password)) throw new Error('Senha incorreta.');
            const hash = await bcrypt.hash(new_password, 10);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
        }
        if (email && email !== user.email) {
            if (!current_password || !await bcrypt.compare(current_password, user.password)) throw new Error('Senha necessária.');
            await db.query('UPDATE users SET email = $1 WHERE id = $2', [email, user.id]);
        }
        req.flash('success', 'Atualizado.');
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
