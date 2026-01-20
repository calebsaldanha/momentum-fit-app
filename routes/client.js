const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// === PROFILE (ANAMNESE) ===
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date, c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        const clientData = result.rows[0] || {};
        
        // Normalização de dados para leitura
        clientData.goal = clientData.fitness_goals || clientData.goal;
        clientData.weight = clientData.current_weight || clientData.weight;
        clientData.height = clientData.height;
        clientData.equipment = clientData.available_equipment || clientData.equipment;
        clientData.activity_level = clientData.daily_activity_level || clientData.activity_level;

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
        
        // 1. Atualizar Tabela Users
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);

        // 2. Preparar JSON de medidas
        const measurements = {
            chest: data.meas_chest, waist: data.meas_waist, hips: data.meas_hips,
            arms: data.meas_arms, thighs: data.meas_thighs
        };

        // 3. Verificar existência
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        // IMPORTANTE: Mapear TODOS os campos possíveis do banco para garantir que salvem
        // Seu banco tem colunas duplicadas/similares, vamos salvar em ambas para garantir.
        const params = [
            req.session.user.id,                    // $1
            data.weight,                            // $2 (weight)
            data.weight,                            // $3 (current_weight - redundância)
            data.height,                            // $4
            data.goal,                              // $5 (goal)
            data.goal,                              // $6 (fitness_goals - redundância)
            data.goal_description,                  // $7
            data.training_experience,               // $8
            data.preferred_training_time,           // $9
            data.medical_history,                   // $10
            data.medications,                       // $11
            data.injuries,                          // $12
            data.emergency_contact,                 // $13
            data.emergency_phone,                   // $14
            data.sleep_quality,                     // $15
            data.stress_level,                      // $16
            data.water_intake,                      // $17
            data.smoking_status,                    // $18
            data.available_equipment,               // $19 (available_equipment)
            data.available_equipment,               // $20 (equipment - redundância)
            data.daily_activity_level,              // $21 (daily_activity_level)
            data.daily_activity_level,              // $22 (activity_level - redundância)
            data.alcohol_consumption,               // $23
            data.dietary_restrictions,              // $24
            data.liked_exercises,                   // $25
            data.disliked_exercises,                // $26
            JSON.stringify(measurements)            // $27
        ];

        if(check.rows.length === 0) {
            await db.query(`INSERT INTO clients (
                user_id, 
                weight, current_weight, 
                height, 
                goal, fitness_goals, 
                goal_description, training_experience, preferred_training_time, 
                medical_history, medications, injuries, 
                emergency_contact, emergency_phone, 
                sleep_quality, stress_level, water_intake, smoking_status, 
                available_equipment, equipment,
                daily_activity_level, activity_level,
                alcohol_consumption, dietary_restrictions, 
                liked_exercises, disliked_exercises, body_measurements
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`, 
               params);
        } else {
            await db.query(`UPDATE clients SET 
                weight=$2, current_weight=$3, 
                height=$4, 
                goal=$5, fitness_goals=$6, 
                goal_description=$7, training_experience=$8, preferred_training_time=$9, 
                medical_history=$10, medications=$11, injuries=$12, 
                emergency_contact=$13, emergency_phone=$14, 
                sleep_quality=$15, stress_level=$16, water_intake=$17, smoking_status=$18, 
                available_equipment=$19, equipment=$20,
                daily_activity_level=$21, activity_level=$22,
                alcohol_consumption=$23, dietary_restrictions=$24, 
                liked_exercises=$25, disliked_exercises=$26, body_measurements=$27
               WHERE user_id=$1`, 
               params);
        }

        await db.query('COMMIT');
        req.flash('success', 'Perfil salvo com sucesso!');
        res.redirect('/client/profile');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error("Erro ao salvar perfil:", e);
        req.flash('error', 'Erro ao salvar perfil. Tente novamente.');
        res.redirect('/client/profile');
    }
});

// === SETTINGS (CONTA) ===
router.get('/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]);
        res.render('pages/client-settings', { settingsUser: result.rows[0] });
    } catch (e) {
        console.error(e);
        res.redirect('/client/dashboard');
    }
});

router.post('/settings', async (req, res) => {
    const { email, current_password, new_password, confirm_password } = req.body;
    try {
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
        const user = userRes.rows[0];

        if (new_password) {
            if (!current_password) throw new Error('Senha atual necessária.');
            if (new_password !== confirm_password) throw new Error('Senhas não conferem.');
            const match = await bcrypt.compare(current_password, user.password);
            if (!match) throw new Error('Senha incorreta.');
            const hash = await bcrypt.hash(new_password, 10);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
        }

        if (email && email !== user.email) {
            if (!current_password) throw new Error('Senha atual necessária para trocar e-mail.');
            const match = await bcrypt.compare(current_password, user.password);
            if (!match) throw new Error('Senha incorreta.');
            await db.query('UPDATE users SET email = $1 WHERE id = $2', [email, user.id]);
        }

        req.flash('success', 'Dados atualizados.');
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect('/client/settings');
});

// === FINANCIAL ===
router.get('/financial', async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Assinatura (corrigido para não quebrar se não existir)
        const subRes = await db.query(`
            SELECT s.*, p.name as plan_name, p.price, p.features 
            FROM subscriptions s 
            JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 AND s.status = 'active'
        `, [userId]);

        // Histórico de Pagamentos (CORRIGIDO: JOIN via subscriptions e não plan_id direto na payments)
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
        console.error("Erro Client Financial:", err);
        // Opcional: mostrar erro na tela ao invés de redirecionar cegamente
        req.flash('error', 'Erro ao carregar financeiro.'); 
        res.redirect('/client/dashboard');
    }
});

// Outras Rotas
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: {} }));
router.get('/plans', (req, res) => res.render('pages/client-plans', { plans: [] }));
router.get('/content', (req, res) => res.render('pages/client-content', { articles: [] }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.get('/workouts', (req, res) => res.render('pages/client-workouts', { workouts: [] }));
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { history: [] }));

module.exports = router;
