const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../database/db');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Login Page
router.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login', csrfToken: res.locals.csrfToken });
});

// Login Process
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            
            // Redirecionamento baseado no cargo
            if (user.role === 'superadmin') return res.redirect('/superadmin/dashboard');
            if (user.role === 'trainer') return res.redirect('/admin/dashboard');
            return res.redirect('/client/dashboard');
        } else {
            res.render('pages/login', { 
                title: 'Login', 
                error: 'Email ou senha inválidos',
                csrfToken: res.locals.csrfToken 
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro no servidor.' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

// --- ESQUECI MINHA SENHA ---

// 1. Formulário de Solicitação
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: 'Recuperar Senha', csrfToken: res.locals.csrfToken });
});

// 2. Processar Solicitação
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const token = crypto.randomBytes(20).toString('hex');
        
        // CORREÇÃO: Usar objeto Date do JavaScript em vez de milissegundos
        const expires = new Date(Date.now() + 3600000); // 1 hora a partir de agora

        const result = await pool.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3 RETURNING id",
            [token, expires, email]
        );

        if (result.rows.length > 0) {
            await sendPasswordResetEmail(email, token, req.headers.host);
        }

        res.render('pages/forgot-password', { 
            title: 'Recuperar Senha', 
            success: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.',
            csrfToken: res.locals.csrfToken
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao processar solicitação.' });
    }
});

// 3. Formulário de Nova Senha (via Link do Email)
router.get('/reset/:token', async (req, res) => {
    try {
        // CORREÇÃO: Comparar com new Date() (agora)
        const result = await pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
            [req.params.token, new Date()]
        );

        if (result.rows.length === 0) {
            return res.render('pages/forgot-password', { 
                title: 'Recuperar Senha', 
                error: 'O link de redefinição é inválido ou expirou.',
                csrfToken: res.locals.csrfToken
            });
        }

        res.render('pages/reset-password', { 
            title: 'Nova Senha', 
            token: req.params.token,
            csrfToken: res.locals.csrfToken 
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro interno.' });
    }
});

// 4. Salvar Nova Senha
router.post('/reset/:token', async (req, res) => {
    const { password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.render('pages/reset-password', {
            title: 'Nova Senha',
            token: req.params.token,
            error: 'As senhas não coincidem.',
            csrfToken: res.locals.csrfToken
        });
    }

    try {
        // CORREÇÃO: Comparar com new Date()
        const result = await pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
            [req.params.token, new Date()]
        );

        if (result.rows.length === 0) {
            return res.redirect('/auth/forgot-password');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.query(
            "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
            [hashedPassword, result.rows[0].id]
        );

        res.redirect('/auth/login?reset=success');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao redefinir senha.' });
    }
});

module.exports = router;
