const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../database/db');
const { sendPasswordResetEmail, sendPasswordChangedEmail, sendNewUserEmail } = require('../utils/emailService');

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
            // Verifica se está ativo
            if (user.status === 'suspended' || user.status === 'inactive') {
                return res.render('pages/login', { 
                    title: 'Login', 
                    error: 'Sua conta está suspensa ou inativa. Contate o suporte.',
                    csrfToken: res.locals.csrfToken 
                });
            }

            req.session.user = user;
            if (user.role === 'superadmin') return res.redirect('/superadmin/dashboard');
            if (user.role === 'trainer') return res.redirect('/admin/dashboard');
            return res.redirect('/client/dashboard');
        } else {
            res.render('pages/login', { title: 'Login', error: 'Email ou senha inválidos', csrfToken: res.locals.csrfToken });
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

// Registro (Register)
router.get('/register', (req, res) => {
    res.render('pages/register', { title: 'Cadastro', csrfToken: res.locals.csrfToken });
});

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body; // role pode vir ou ser fixo 'client'
    const finalRole = (role === 'trainer') ? 'trainer' : 'client'; // Segurança básica

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Verifica se email já existe
        const check = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            return res.render('pages/register', { 
                title: 'Cadastro', 
                error: 'Email já cadastrado.', 
                csrfToken: res.locals.csrfToken 
            });
        }

        // Insere Usuário
        await pool.query(
            "INSERT INTO users (name, email, password, role, created_at, status) VALUES ($1, $2, $3, $4, NOW(), 'active')",
            [name, email, hashedPassword, finalRole]
        );

        // NOTIFICAÇÃO: Email para Admin sobre novo usuário
        // Busca email do superadmin
        const adminRes = await pool.query("SELECT email FROM users WHERE role = 'superadmin' LIMIT 1");
        if (adminRes.rows.length > 0) {
            sendNewUserEmail(adminRes.rows[0].email, name, email, finalRole).catch(console.error);
        }

        res.redirect('/auth/login?registered=true');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao registrar.' });
    }
});

// --- ESQUECI MINHA SENHA ---
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: 'Recuperar Senha', csrfToken: res.locals.csrfToken });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hora

        const result = await pool.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3 RETURNING id",
            [token, expires, email]
        );

        if (result.rows.length > 0) {
            // NOTIFICAÇÃO: Email com Link
            await sendPasswordResetEmail(email, token, req.headers.host);
        }

        res.render('pages/forgot-password', { 
            title: 'Recuperar Senha', 
            success: 'Se o e-mail estiver cadastrado, você receberá um link.',
            csrfToken: res.locals.csrfToken
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao processar solicitação.' });
    }
});

router.get('/reset/:token', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
            [req.params.token, new Date()]
        );
        if (result.rows.length === 0) {
            return res.render('pages/forgot-password', { 
                title: 'Recuperar Senha', 
                error: 'Link inválido ou expirado.',
                csrfToken: res.locals.csrfToken
            });
        }
        res.render('pages/reset-password', { title: 'Nova Senha', token: req.params.token, csrfToken: res.locals.csrfToken });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro interno.' });
    }
});

router.post('/reset/:token', async (req, res) => {
    const { password, confirm_password } = req.body;
    if (password !== confirm_password) {
        return res.render('pages/reset-password', { title: 'Nova Senha', token: req.params.token, error: 'As senhas não coincidem.', csrfToken: res.locals.csrfToken });
    }
    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
            [req.params.token, new Date()]
        );
        if (result.rows.length === 0) return res.redirect('/auth/forgot-password');

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
            [hashedPassword, result.rows[0].id]
        );

        // NOTIFICAÇÃO: Confirmação de alteração
        sendPasswordChangedEmail(result.rows[0].email, result.rows[0].name).catch(console.error);

        res.redirect('/auth/login?reset=success');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro ao redefinir senha.' });
    }
});

module.exports = router;
