const express = require('express');
const router = express.Router();

// Middleware auxiliar para renderizar views públicas com dados de sessão
const renderPublic = (res, req, view, title) => {
    res.render(view, {
        title: title,
        user: req.session.user || null,
        path: req.path
    });
};

router.get('/', (req, res) => renderPublic(res, req, 'pages/index', 'Início'));
router.get('/plans', (req, res) => renderPublic(res, req, 'pages/plans', 'Planos e Preços'));
router.get('/about', (req, res) => renderPublic(res, req, 'pages/about', 'Sobre Nós'));
router.get('/contact', (req, res) => renderPublic(res, req, 'pages/contact', 'Contato'));
router.get('/terms', (req, res) => renderPublic(res, req, 'pages/terms', 'Termos de Uso'));
router.get('/privacy', (req, res) => renderPublic(res, req, 'pages/privacy', 'Política de Privacidade'));
router.get('/cookies', (req, res) => renderPublic(res, req, 'pages/cookies', 'Política de Cookies'));

module.exports = router;
