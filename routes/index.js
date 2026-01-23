const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    // Passa user se existir na sessão
    res.render('pages/index', { user: req.session.user });
});

router.get('/about', (req, res) => {
    // Renderiza explicitamente a página about.ejs
    res.render('pages/about', { user: req.session.user });
});

router.get('/plans', (req, res) => {
    res.render('pages/plans', { user: req.session.user });
});

router.get('/contact', (req, res) => {
    res.render('pages/contact', { user: req.session.user });
});

module.exports = router;
