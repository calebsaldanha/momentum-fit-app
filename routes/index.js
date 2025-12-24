const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    // Renderiza a home passando o usuário para o header se adaptar (mostrar "Painel" em vez de "Entrar")
    res.render('pages/index', {
        title: 'Início - Momentum Fit',
        user: req.session.user || null
    });
});

router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'Sobre - Momentum Fit',
        user: req.session.user || null
    });
});

module.exports = router;
