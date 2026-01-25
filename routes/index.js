const express = require('express');
const router = express.Router();

/**
 * Middleware de Renderização Segura
 * Garante que todas as views públicas recebam o contexto de autenticação corretamente.
 * Previne erros de referência 'user is not defined' nos headers.
 */
const renderPublic = (res, req, view, title) => {
    // Sanitização básica
    const user = req.user || req.session.user || null;
    
    res.render(view, {
        title: title,
        user: user, 
        path: req.path,
        query: req.query // Útil para capturar 'plan=pro' na url
    });
};

/* --- Rotas Públicas --- */

router.get('/', (req, res) => {
    renderPublic(res, req, 'pages/index', 'Início');
});

router.get('/plans', (req, res) => {
    renderPublic(res, req, 'pages/plans', 'Planos e Preços');
});

router.get('/about', (req, res) => {
    renderPublic(res, req, 'pages/about', 'Sobre Nós');
});

router.get('/contact', (req, res) => {
    renderPublic(res, req, 'pages/contact', 'Contato');
});

router.get('/terms', (req, res) => {
    renderPublic(res, req, 'pages/terms', 'Termos de Uso');
});

router.get('/privacy', (req, res) => {
    renderPublic(res, req, 'pages/privacy', 'Política de Privacidade');
});

router.get('/cookies', (req, res) => {
    renderPublic(res, req, 'pages/cookies', 'Política de Cookies');
});

// Tratamento de Erro 404 (para rotas não definidas na raiz)
// Isso evita que o app crashe se o usuário digitar algo errado na URL base
router.get('*', (req, res, next) => {
    // Se a rota começar com /auth, /api, /client, /trainer ou /admin, passa para o próximo router
    if (req.path.match(/^\/(auth|api|client|trainer|admin|superadmin)/)) {
        return next();
    }
    // Caso contrário, 404 público estilizado
    res.status(404).render('pages/error', {
        title: 'Página não encontrada',
        user: req.user || req.session.user || null,
        message: 'A página que você procura não existe ou foi movida.',
        path: req.path
    });
});

module.exports = router;
