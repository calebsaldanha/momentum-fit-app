const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    // Renderiza a home passando o usuário para o header se adaptar (mostrar "Painel" em vez de "Entrar")
    // Adicionado currentPage: 'index' para identificar página pública e remover sidebar/padding
    res.render('pages/index', {
        title: 'Início - Momentum Fit',
        user: req.session.user || null,
        currentPage: 'index'
    });
});

router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'Sobre - Momentum Fit',
        user: req.session.user || null,
        currentPage: 'about'
    });
});

module.exports = router;
