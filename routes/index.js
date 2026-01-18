const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Home
router.get('/', (req, res) => {
    res.render('pages/index');
});

// Sobre
router.get('/about', (req, res) => {
    res.render('pages/about');
});

// Planos (CORRIGIDO: Busca do DB)
router.get('/plans', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM plans ORDER BY price ASC");
        res.render('pages/plans', { plans: result.rows });
    } catch (err) {
        console.error(err);
        // Fallback se o banco falhar
        res.render('pages/plans', { plans: [] });
    }
});

// Contato
router.get('/contact', (req, res) => {
    res.render('pages/contact');
});

// Termos de Uso
router.get('/terms', (req, res) => {
    res.render('pages/terms');
});

router.get('/home', (req, res) => res.redirect('/'));

module.exports = router;
