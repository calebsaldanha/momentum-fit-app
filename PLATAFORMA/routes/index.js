const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('pages/index', {
        title: 'Início - Momentum Fit'
    });
});

router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'Sobre - Momentum Fit'
    });
});

module.exports = router;