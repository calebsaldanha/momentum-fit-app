const express = require('express');
const router = express.Router();

/**
 * Middleware de Renderização Segura (Public Shield)
 * Objetivo: Passar contexto de auth para o header não quebrar.
 */
const renderPublic = (res, req, view, title) => {
    // Extração segura do usuário (suporta passport e session pura)
    const user = req.user || req.session.user || null;
    
    res.render(view, {
        title: title,
        user: user,
        path: req.path,
        query: req.query // Passa query params (ex: ?plan=pro)
    });
};

// Rotas
router.get('/', (req, res) => renderPublic(res, req, 'pages/index', 'Início'));
router.get('/plans', (req, res) => renderPublic(res, req, 'pages/plans', 'Planos e Preços'));
router.get('/about', (req, res) => renderPublic(res, req, 'pages/about', 'Sobre Nós'));
router.get('/contact', (req, res) => renderPublic(res, req, 'pages/contact', 'Contato'));
router.get('/terms', (req, res) => renderPublic(res, req, 'pages/terms', 'Termos de Uso'));
router.get('/privacy', (req, res) => renderPublic(res, req, 'pages/privacy', 'Política de Privacidade'));
router.get('/cookies', (req, res) => renderPublic(res, req, 'pages/cookies', 'Política de Cookies'));

// Fallback 404 Público (Não afeta API)
router.get('*', (req, res, next) => {
    if (req.path.match(/^\/(auth|api|client|trainer|admin|superadmin)/)) {
        return next();
    }
    res.status(404).render('pages/error', {
        title: 'Página não encontrada',
        user: req.user || req.session.user || null,
        message: 'A página que você procura não existe.',
        path: req.path
    });
});

module.exports = router;
