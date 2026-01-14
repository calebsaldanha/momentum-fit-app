const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
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
