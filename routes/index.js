const express = require('express');
const router = express.Router();

// Middleware simples para passar user para views
router.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    next();
});

router.get('/', (req, res) => res.render('pages/index', { title: 'Início', currentPage: 'home' }));
router.get('/about', (req, res) => res.render('pages/about', { title: 'Sobre', currentPage: 'about' }));
router.get('/articles', (req, res) => res.render('pages/articles', { title: 'Artigos', articles: [], currentPage: 'articles' })); // Precisa buscar do DB depois
router.get('/plans', (req, res) => {
    const plans = [
        { name: 'Fit Start', price: 29.90, features: ['Acesso Básico', 'IA Limitada'] },
        { name: 'Pro Evolution', price: 59.90, features: ['Tudo do Start', 'Personal', 'Nutrição'], recommended: true }
    ];
    res.render('pages/plans', { title: 'Planos', plans, currentPage: 'plans' });
});
router.get('/contact', (req, res) => res.render('pages/contact', { title: 'Contato', currentPage: 'contact' }));
router.get('/terms', (req, res) => res.render('pages/terms', { title: 'Termos Legais', currentPage: 'terms' }));

module.exports = router;
