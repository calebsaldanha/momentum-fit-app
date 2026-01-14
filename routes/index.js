const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    res.render('pages/index', { title: 'Início', user: req.session.user, currentPage: 'home' });
});

router.get('/about', (req, res) => {
    res.render('pages/about', { title: 'Sobre Nós', user: req.session.user, currentPage: 'about' });
});

router.get('/plans', async (req, res) => {
    // Simula planos (ou busca do DB se tiver cadastrado)
    const plans = [
        { name: 'Fit Start', price: 29.90, features: ['Acesso ao App', 'Treinos Básicos', 'IA Coach Limitado'], role: 'client' },
        { name: 'Pro Evolution', price: 59.90, features: ['Personal Trainer', 'Treinos Ilimitados', 'IA Coach Completo', 'Nutrição'], role: 'client', recommended: true },
        { name: 'Trainer Partner', price: 99.90, features: ['Gestão de Alunos', 'Recebimento Online', 'Biblioteca de Exercícios'], role: 'trainer' }
    ];
    res.render('pages/plans', { title: 'Planos & Preços', user: req.session.user, plans, currentPage: 'plans' });
});

router.get('/contact', (req, res) => {
    res.render('pages/contact', { title: 'Contato', user: req.session.user, currentPage: 'contact' });
});

module.exports = router;
