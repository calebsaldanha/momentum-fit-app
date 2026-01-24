const express = require('express');
const router = express.Router();
const pool = require('../database/db'); // Alterado de db para pool para consistÃªncia
// í»¡ï¸ ImportaÃ§Ã£o desestruturada segura
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Debug de carga
console.log("í´’ Carregando rotas de Cliente...");

// 1. Aplica autenticaÃ§Ã£o em TODAS as rotas deste arquivo
router.use(ensureAuthenticated);

// 2. Garante que Ã© cliente (ou superadmin)
router.use(ensureRole('client'));

// GET: Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Exemplo de query segura
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.render('pages/client-dashboard', { 
            user: req.user,
            clientData: result.rows[0] || {}
        });
    } catch (err) {
        console.error("Erro no dashboard cliente:", err);
        res.render('pages/error', { message: 'Erro ao carregar dashboard' });
    }
});

// GET: Initial Form (Se existir)
router.get('/initial-form', (req, res) => {
    res.render('pages/initial-form', { user: req.user });
});

module.exports = router;
