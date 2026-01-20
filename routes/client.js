const express = require('express');
const router = express.Router();
const db = require('../database/db');

function isClient(req, res, next) {
    if (req.session.user && req.session.user.role === 'client') return next();
    res.redirect('/auth/login');
}

router.use(isClient);

// Profile - Rota Limpa
router.get('/profile', async (req, res) => {
    try {
        const result = await db.query(\`
            SELECT u.name, u.email, u.phone, u.birth_date, c.*
            FROM users u
            LEFT JOIN clients c ON u.id = c.user_id
            WHERE u.id = $1
        \`, [req.session.user.id]);
        
        const clientData = result.rows[0] || {};
        const subscription = { plan: 'Básico', price: '10.00' }; // Mock seguro

        // CORREÇÃO: Usar 'clientData' como chave para não conflitar com opção 'client' do EJS
        res.render('pages/client-profile', { 
            clientData: clientData,
            subscription: subscription
        });
    } catch (err) {
        console.error("Erro Client Profile:", err);
        res.redirect('/client/dashboard');
    }
});

// Post Profile
router.post('/profile', async (req, res) => {
    const data = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET name=$1, phone=$2, birth_date=$3 WHERE id=$4', 
            [data.name, data.phone, data.birth_date || null, req.session.user.id]);

        const check = await db.query('SELECT 1 FROM clients WHERE user_id=$1', [req.session.user.id]);
        
        if(check.rows.length === 0) {
            await db.query('INSERT INTO clients (user_id, weight, height, goal) VALUES ($1, $2, $3, $4)', 
                [req.session.user.id, data.weight, data.height, data.goal]);
        } else {
            await db.query('UPDATE clients SET weight=$1, height=$2, goal=$3 WHERE user_id=$4', 
                [data.weight, data.height, data.goal, req.session.user.id]);
        }
        await db.query('COMMIT');
        req.flash('success', 'Salvo com sucesso.');
        res.redirect('/client/profile');
    } catch(e) {
        await db.query('ROLLBACK');
        console.error(e);
        req.flash('error', 'Erro ao salvar.');
        res.redirect('/client/profile');
    }
});

// Outras rotas...
router.get('/dashboard', (req, res) => res.render('pages/client-dashboard', { stats: {} }));
router.get('/workouts', (req, res) => res.render('pages/client-workouts', { workouts: [] }));
router.get('/evolution', (req, res) => res.render('pages/client-evolution', { history: [] }));
router.get('/financial', (req, res) => res.render('pages/client-financial', { subscription: {} }));
router.get('/settings', (req, res) => res.render('pages/client-settings'));
router.get('/plans', (req, res) => res.render('pages/client-plans', { plans: [] }));
router.get('/content', (req, res) => res.render('pages/client-content', { articles: [] }));
router.get('/ai-coach', (req, res) => res.render('pages/client-ai-coach'));

module.exports = router;
