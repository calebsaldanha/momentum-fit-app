const express = require('express');
const router = express.Router();

// Home
router.get('/', (req, res) => {
    res.render('pages/index');
});

// Sobre
router.get('/about', (req, res) => {
    res.render('pages/about');
});

// Planos
router.get('/plans', (req, res) => {
    res.render('pages/plans');
});

// Contato
router.get('/contact', (req, res) => {
    res.render('pages/contact');
});

// Termos de Uso
router.get('/terms', (req, res) => {
    res.render('pages/terms');
});

// Redireciona /home para /
router.get('/home', (req, res) => res.redirect('/'));

module.exports = router;
