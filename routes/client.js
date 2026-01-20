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
        const result = await db.query(\`
            SELECT u.name, u.email, u.phone, u.birth_date, c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        \`, [req.session.user.id]);
        
        const clientData = result.rows[0] || {};
        clientData.goal = clientData.fitness_goals || clientData.goal; 
        
        // Garantir que body_measurements seja um objeto
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
        
        // Atualizar User
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);

        // Preparar JSON de medidas
        const measurements = {
            chest: data.meas_chest,
            waist: data.meas_waist,
            hips: data.meas_hips,
            arms: data.meas_arms,
            thighs: data.meas_thighs
        };

        // Upsert Client
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        const fields = [
            req.session.user.id, data.weight, data.height, data.goal, data.goal_description,
            data.training_experience, data.preferred_training_time, data.medical_history, data.medications,
            data.injuries, data.emergency_contact, data.emergency_phone, data.sleep_quality, data.stress_level,
            data.water_intake, data.smoking_status, data.available_equipment,
            // Novos campos
            data.daily_activity_level, data.alcohol_consumption, data.dietary_restrictions, 
            data.liked_exercises, data.disliked_exercises, JSON.stringify(measurements)
        ];

        if(check.rows.length === 0) {
            await db.query(\`INSERT INTO clients (
                user_id, current_weight, height, fitness_goals, goal_description, 
                training_experience, preferred_training_time, medical_history, medications, 
                injuries, emergency_contact, emergency_phone, sleep_quality, stress_level, 
                water_intake, smoking_status, available_equipment,
                daily_activity_level, alcohol_consumption, dietary_restrictions,
                liked_exercises, disliked_exercises, body_measurements
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)\`, 
               fields);
        } else {
            await db.query(\`UPDATE clients SET 
                current_weight=$2, height=$3, fitness_goals=$4, goal_description=$5, 
                training_experience=$6, preferred_training_time=$7, medical_history=$8, medications=$9, 
                injuries=$10, emergency_contact=$11, emergency_phone=$12, sleep_quality=$13, stress_level=$14, 
                water_intake=$15, smoking_status=$16, available_equipment=$17,
                daily_activity_level=$18, alcohol_consumption=$19, dietary_restrictions=$20,
                liked_exercises=$21, disliked_exercises=$22, body_measurements=$23
               WHERE user_id=$1\`, 
               fields);
        }

        await db.query('COMMIT');
        req.flash('success', 'Perfil atualizado com sucesso.');
        res.redirect('/client/profile');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error(e);
        req.flash('error', 'Erro ao salvar perfil.');
        res.redirect('/client/profile');
    }
});

// === SETTINGS (CONTA) ===
router.get('/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]);
        res.render('pages/client-settings', { user: result.rows[0] });
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
        
        // Buscar assinatura ativa
        const subRes = await db.query(\`
            SELECT s.*, p.name as plan_name, p.price, p.features 
            FROM subscriptions s 
            JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1 AND s.status = 'active'
        \`, [userId]);

        // Buscar histórico de pagamentos
        const payRes = await db.query(\`
            SELECT py.*, p.name as plan_name 
            FROM payments py
            LEFT JOIN plans p ON py.plan_id = p.id
            WHERE py.user_id = $1
            ORDER BY py.created_at DESC
        \`, [userId]);

        res.render('pages/client-financial', { 
            subscription: subRes.rows[0] || null,
            payments: payRes.rows
        });
    } catch (err) {
        console.error("Erro Financial:", err);
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
