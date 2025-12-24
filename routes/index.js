const express = require('express');
const router = express.Router();

// Rota da Página Inicial (Landing Page)
router.get('/', (req, res) => {
    // Renderiza a página inicial passando o usuário (se existir) para o header se adaptar
    // Não força mais o redirecionamento
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
