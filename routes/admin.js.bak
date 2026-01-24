const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

console.log("í±‘ Carregando rotas de Admin...");

router.use(ensureAuthenticated);
// Aceita 'admin' (superadmin jÃ¡ Ã© tratado no ensureRole)
router.use(ensureRole('admin'));

router.get('/dashboard', (req, res) => {
    res.render('pages/admin-dashboard', { user: req.user });
});

module.exports = router;
