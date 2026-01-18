const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { getChatResponse } = require('../utils/aiService');

// CHAVE PIX DEFINIDA PELO USUÁRIO
const PIX_KEY = '084dee93-9dc5-44e7-aa2e-3eff8623651d';

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// Dashboard
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } }));

// Treinos
router.get('/workouts', async (req, res) => {
    try {
        const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
        res.render('pages/client-workouts', { workouts: workouts.rows });
    } catch(e) { res.render('pages/client-workouts', { workouts: [] }); }
});

// Perfil (Com lógica de Pagamento PIX e Plano Teste)
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date,
                   c.weight, c.height, c.goal, c.medical_history
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        // Busca o plano de teste
        const planRes = await db.query("SELECT * FROM plans WHERE name = 'Momentum Básico'");
        const planPrice = planRes.rows[0] ? planRes.rows[0].price : '10.00';

        // Gera URL do QR Code (API Pública para MVP)
        // Em produção usaria biblioteca 'qrcode' do npm
        const pixPayload = `00020126360014BR.GOV.BCB.PIX0114${PIX_KEY}5204000053039865405${planPrice.replace('.','')}5802BR5912MomentumFit6009SaoPaulo62070503***6304`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PIX_KEY)}`;

        const subscription = { 
            plan: 'Momentum Básico', 
            status: 'Pendente', 
            price: planPrice,
            pixKey: PIX_KEY,
            qrCode: qrCodeUrl
        };

        res.render('pages/client-profile', { client: result.rows[0] || {}, subscription });
    } catch (err) {
        console.error("Erro perfil:", err);
        res.redirect('/client/dashboard');
    }
});

// IA Coach
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));
router.post('/ai-coach/message', async (req, res) => {
    const { message } = req.body;
    const response = await getChatResponse(req.session.user.id, message);
    res.json({ response });
});

router.post('/profile', async (req, res) => {
    // Salvar perfil simplificado
    const { name, weight, height, goal } = req.body;
    try {
        await db.query('UPDATE users SET name=$1 WHERE id=$2', [name, req.session.user.id]);
        // Upsert client data
        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        if(check.rows.length === 0) {
            await db.query('INSERT INTO clients (user_id, weight, height, goal) VALUES ($1, $2, $3, $4)', [req.session.user.id, weight, height, goal]);
        } else {
            await db.query('UPDATE clients SET weight=$1, height=$2, goal=$3 WHERE user_id=$4', [weight, height, goal, req.session.user.id]);
        }
        req.flash('success', 'Perfil salvo.');
    } catch(e) { console.error(e); req.flash('error', 'Erro ao salvar.'); }
    res.redirect('/client/profile');
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution'));
router.get('/settings', (req, res) => res.render('pages/client-settings'));

module.exports = router;
