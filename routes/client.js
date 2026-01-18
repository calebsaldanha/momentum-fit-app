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
router.get('/dashboard', async (req, res) => {
    res.render('pages/client-dashboard', { stats: { completedWorkouts: 0, checkinsCount: 0 } });
});

// Treinos Lista
router.get('/workouts', async (req, res) => {
    const workouts = await db.query("SELECT * FROM workouts WHERE user_id = $1", [req.session.user.id]);
    res.render('pages/client-workouts', { workouts: workouts.rows });
});

// IA Coach (View)
router.get('/ai-coach', (req, res) => {
    res.render('pages/client-ai-coach');
});

// IA Coach (API POST)
router.post('/ai-coach/message', async (req, res) => {
    const { message } = req.body;
    const response = await getChatResponse(req.session.user.id, message);
    res.json({ response });
});

// Perfil (Correção do Carregamento)
router.get('/profile', async (req, res) => {
    try {
        // LEFT JOIN para trazer usuário mesmo se não tiver dados na tabela clients ainda
        const result = await db.query(`
            SELECT u.name, u.email, u.phone, u.birth_date,
                   c.weight, c.height, c.goal, c.medical_history, c.activity_level, c.limitations
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        `, [req.session.user.id]);
        
        // Simulação de Assinatura para MVP
        const subscription = { plan: 'Free', status: 'Ativo', price: '0,00' };

        res.render('pages/client-profile', { client: result.rows[0] || {}, subscription });
    } catch (err) {
        console.error(err);
        res.redirect('/client/dashboard');
    }
});

router.post('/profile', async (req, res) => {
    // Atualização básica
    const { name, weight, height, goal, medical_history } = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, req.session.user.id]);
        
        // Verifica se client existe, se não, cria (Upsert simplificado)
        const check = await db.query('SELECT 1 FROM clients WHERE user_id = $1', [req.session.user.id]);
        if (check.rows.length === 0) {
            await db.query('INSERT INTO clients (user_id, weight, height, goal, medical_history) VALUES ($1, $2, $3, $4, $5)',
                [req.session.user.id, weight, height, goal, medical_history]);
        } else {
            await db.query('UPDATE clients SET weight=$1, height=$2, goal=$3, medical_history=$4 WHERE user_id=$5',
                [weight, height, goal, medical_history, req.session.user.id]);
        }
        await db.query('COMMIT');
        req.flash('success', 'Perfil atualizado!');
    } catch (e) {
        await db.query('ROLLBACK');
        req.flash('error', 'Erro ao salvar.');
    }
    res.redirect('/client/profile');
});

router.get('/evolution', (req, res) => res.render('pages/client-evolution'));
router.get('/settings', (req, res) => res.render('pages/client-settings'));

module.exports = router;
