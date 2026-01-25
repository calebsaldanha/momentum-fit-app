const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

// Middleware: Apenas clientes
const isClient = [ensureAuthenticated, ensureRole('client')];

// Dashboard Principal
router.get('/dashboard', isClient, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Buscar dados reais do dashboard
        const dashboardQuery = `
            SELECT 
                (SELECT COUNT(*) FROM workouts WHERE client_id = $1 AND is_active = true) as total_workouts,
                (SELECT name FROM plans WHERE id = (SELECT current_plan_id FROM users WHERE id = $1)) as plan_name
        `;
        
        const result = await pool.query(dashboardQuery, [userId]);
        const stats = result.rows[0];

        res.render('pages/client-dashboard', {
            user: req.user,
            stats: stats || { total_workouts: 0, plan_name: 'Gratuito' },
            title: 'Meu Painel', // FIX: Variável title obrigatória
            path: '/client/dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao carregar dashboard');
    }
});

// Outras rotas do cliente (Placeholders para não quebrar links)
router.get('/workouts', isClient, (req, res) => {
    res.render('pages/client-workouts', { user: req.user, title: 'Meus Treinos', path: '/client/workouts' });
});

router.get('/evolution', isClient, (req, res) => {
    res.render('pages/client-evolution', { user: req.user, title: 'Minha Evolução', path: '/client/evolution' });
});

router.get('/ai-coach', isClient, (req, res) => {
    res.render('pages/client-ai-coach', { user: req.user, title: 'IA Coach', path: '/client/ai-coach' });
});

router.get('/plans', isClient, async (req, res) => {
    const plans = await pool.query('SELECT * FROM plans WHERE is_active = true ORDER BY price ASC');
    res.render('pages/client-plans', { 
        user: req.user, 
        plans: plans.rows,
        title: 'Planos', 
        path: '/client/plans' 
    });
});

module.exports = router;
