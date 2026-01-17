const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware simples para passar user para views
router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    next();
});

router.get('/', async (req, res) => {
    try {
        // Busca 3 treinadores aprovados para destaque na Home
        const trainersQuery = `
            SELECT u.name, u.profile_image, t.specialties, t.bio 
            FROM trainers t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.approval_status = 'approved' 
            LIMIT 3
        `;
        const trainersRes = await db.query(trainersQuery);
        
        res.render('pages/index', { 
            title: 'Início', 
            currentPage: 'home',
            featuredTrainers: trainersRes.rows 
        });
    } catch (err) {
        console.error("Erro ao carregar Home:", err);
        // Em caso de erro, renderiza sem destaques para não quebrar a página
        res.render('pages/index', { 
            title: 'Início', 
            currentPage: 'home', 
            featuredTrainers: [] 
        });
    }
});

router.get('/about', (req, res) => res.render('pages/about', { title: 'Sobre', currentPage: 'about' }));

router.get('/plans', (req, res) => {
    const plans = [
        { name: 'Fit Start', price: 29.90, features: ['Acesso Básico', 'IA Limitada'], active: true },
        { name: 'Pro Evolution', price: 59.90, features: ['Tudo do Start', 'Personal', 'Nutrição'], recommended: true, active: false },
        { name: 'Elite Personal', price: 99.90, features: ['Acompanhamento VIP', 'Videchamadas', 'Dieta Full'], active: false }
    ];
    res.render('pages/plans', { title: 'Planos', plans, currentPage: 'plans' });
});

router.get('/contact', (req, res) => res.render('pages/contact', { title: 'Contato', currentPage: 'contact' }));
router.get('/terms', (req, res) => res.render('pages/terms', { title: 'Termos Legais', currentPage: 'terms' }));

module.exports = router;
