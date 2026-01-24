const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

console.log("í¿‹ï¸ Carregando rotas de Treinador...");

router.use(ensureAuthenticated);
router.use(ensureRole('trainer'));

router.get('/dashboard', (req, res) => {
    res.render('pages/trainer-dashboard', { user: req.user });
});

module.exports = router;
