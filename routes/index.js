const express = require('express');
const router = express.Router();

// Rota Home
router.get('/', (req, res) => {
    // Passar dados necessários se houver
    res.render('pages/index', {
        user: req.session.user
    });
});

// Rota Planos
router.get('/plans', (req, res) => {
    res.render('pages/plans', {
        user: req.session.user
    });
});

// Rota Sobre (Verificando se o arquivo existe, se não, usar index)
router.get('/about', (req, res) => {
    res.render('pages/about', {
        user: req.session.user
    });
});

// Rota Contato
router.get('/contact', (req, res) => {
    res.render('pages/contact', {
        user: req.session.user
    });
});

// Rota Termos (Placeholder)
router.get('/terms', (req, res) => {
    res.render('pages/terms', {
        user: req.session.user
    });
});

module.exports = router;
