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

// Planos (VOLTA A SER ESTÁTICO - MAIS SEGURO)
router.get('/plans', (req, res) => {
    res.render('pages/plans');
});

// Contato
router.get('/contact', (req, res) => {
    res.render('pages/contact');
});

// Termos
router.get('/terms', (req, res) => {
    res.render('pages/terms');
});

router.get('/home', (req, res) => res.redirect('/'));

module.exports = router;
