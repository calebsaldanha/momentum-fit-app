const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const pool = require('../database/db');

// Debug de roteamento
router.use((req, res, next) => {
    console.log(`í´‘ [AUTH ROUTER] Acessando: ${req.path}`);
    next();
});

// GET: Login Page
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        console.log("â™»ï¸ UsuÃ¡rio jÃ¡ logado, redirecionando...");
        return handleDashboardRedirect(req, res);
    }
    console.log("í¶¥ï¸ Renderizando pÃ¡gina de login");
    res.render('pages/login');
});

// POST: Login Logic
router.post('/login', (req, res, next) => {
    console.log("í³¨ Processando login POST...");
    passport.authenticate('local', (err, user, info) => {
        if (err) { 
            console.error("í´¥ Erro Passport:", err); 
            return next(err); 
        }
        if (!user) {
            console.warn("íº« Falha Login:", info ? info.message : 'Dados invÃ¡lidos');
            req.flash('error_msg', info ? info.message : 'Credenciais invÃ¡lidas');
            return res.redirect('/auth/login');
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            console.log(`âœ… Login Sucesso: ${user.email} (${user.role})`);
            
            // Salva sessÃ£o explicitamente antes de redirecionar
            req.session.save(() => {
                handleDashboardRedirect(req, res);
            });
        });
    })(req, res, next);
});

// Logout e Register omitidos para brevidade (mantÃ©m os arquivos originais se existirem, mas aqui reescrevemos o bÃ¡sico para funcionar)
// Vamos reincluir o bÃ¡sico de register/logout para nÃ£o quebrar o app
router.get('/register', (req, res) => res.render('pages/register', { plan: req.query.plan }));
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/auth/login');
    });
});

function handleDashboardRedirect(req, res) {
    const role = req.user.role;
    console.log(`í´€ Redirecionando ${role} para dashboard`);
    if (role === 'admin' || role === 'superadmin') return res.redirect('/admin/dashboard');
    if (role === 'trainer') return res.redirect('/trainer/dashboard');
    if (role === 'client') return res.redirect('/client/dashboard');
    return res.redirect('/');
}

module.exports = router;
