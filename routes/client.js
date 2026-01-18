const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getChatResponse } = require('../utils/aiService');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// Dashboard
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } }));

// Perfil (Anamnese) - CORRIGIDO PARA NÃO TRAVAR
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date, c.*
            FROM users u LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        res.render('pages/client-profile', { client: result.rows[0] || {} });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

// Salvar Perfil e Redirecionar para Financeiro se necessário
router.post('/profile', async (req, res) => {
    const { name, phone, birth_date, ...anamnesis } = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', [name, phone, birth_date || null, req.session.user.id]);
        
        // Upsert Client
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        if (check.rows.length === 0) {
            await db.query(`INSERT INTO clients (user_id, weight, height, goal, training_experience, medical_history) VALUES ($1, $2, $3, $4, $5, $6)`,
                [req.session.user.id, anamnesis.weight, anamnesis.height, anamnesis.goal, anamnesis.training_experience, anamnesis.medical_history]);
        } else {
            // Update simplificado para exemplo (na real faria update de todos os campos)
            await db.query(`UPDATE clients SET weight=$1, height=$2, goal=$3, training_experience=$4, medical_history=$5 WHERE user_id=$6`,
                 [anamnesis.weight, anamnesis.height, anamnesis.goal, anamnesis.training_experience, anamnesis.medical_history, req.session.user.id]);
        }
        await db.query('COMMIT');

        // VERIFICA SE PRECISA PAGAR
        const sub = await db.query("SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [req.session.user.id]);
        
        if (sub.rows.length > 0 && sub.rows[0].price > 0 && sub.rows[0].status === 'pending') {
            req.flash('success', 'Perfil salvo! Realize o pagamento para liberar seu acesso.');
            return res.redirect('/client/financial');
        }

        req.flash('success', 'Perfil atualizado!');
        res.redirect('/client/dashboard');
    } catch (e) {
        await db.query('ROLLBACK');
        console.error(e);
        req.flash('error', 'Erro ao salvar.');
        res.redirect('/client/profile');
    }
});

// NOVA ROTA FINANCEIRA
router.get('/financial', async (req, res) => {
    try {
        const subRes = await db.query("SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [req.session.user.id]);
        const sub = subRes.rows[0] || { plan_name: 'Free', price: 0, status: 'active' };

        // PIX Mockado
        const pixKey = '084dee93-9dc5-44e7-aa2e-3eff8623651d';
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}`;

        res.render('pages/client-financial', { subscription: sub, pixKey, qrCodeUrl });
    } catch (e) {
        res.redirect('/client/dashboard');
    }
});

router.get('/workouts', async (req, res) => {
    try {
        const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/client-workouts', { workouts: workouts.rows });
    } catch(e) { res.render('pages/client-workouts', { workouts: [] }); }
});

router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.post('/ai-coach/message', async (req, res) => {
    const response = await getChatResponse(req.session.user.id, req.body.message);
    res.json({ response });
});

router.get('/plans', (req, res) => res.render('pages/client-plans', { plans: [] }));
router.get('/content', (req, res) => res.render('pages/client-content', { articles: [] }));

module.exports = router;
