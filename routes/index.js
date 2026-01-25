const express = require('express');
const router = express.Router();
const db = require('../database/db'); 

// Middleware para garantir variaveis locais padrao
const defaultLocals = (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.path = req.path;
    next();
};

router.use(defaultLocals);

// --- ROTAS PÚBLICAS ---

// Home
router.get('/', (req, res) => {
    try {
        res.render('pages/index', { 
            title: 'Momentum Fit - Transforme seu corpo com IA'
        });
    } catch (error) {
        console.error('Erro na Home:', error);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página inicial' });
    }
});

// Sobre (A página que estava quebrada)
router.get('/about', (req, res) => {
    try {
        res.render('pages/about', { 
            title: 'Sobre Nós - Momentum Fit'
        });
    } catch (error) {
        console.error('Erro na página Sobre:', error);
        res.status(500).render('pages/error', { message: 'Erro ao carregar página sobre' });
    }
});

// Planos
router.get('/plans', (req, res) => {
    res.render('pages/plans', { 
        title: 'Planos e Preços'
    });
});

// Contato
router.get('/contact', (req, res) => {
    res.render('pages/contact', { 
        title: 'Fale Conosco'
    });
});

// Termos e Privacidade
router.get('/terms', (req, res) => res.render('pages/terms'));
router.get('/privacy', (req, res) => res.render('pages/privacy'));
router.get('/cookies', (req, res) => res.render('pages/cookies'));

module.exports = router;
