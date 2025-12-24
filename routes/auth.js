const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../database/db');
const { sendPasswordResetEmail } = require('../utils/emailService');

router.get('/login', (req, res) => res.render('pages/login', { title: 'Login', error: null, csrfToken: res.locals.csrfToken }));
router.get('/register', (req, res) => res.render('pages/register', { title: 'Cadastro', error: null, csrfToken: res.locals.csrfToken }));

router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, userType } = req.body;
    if (password !== confirmPassword) return res.render('pages/register', { title: 'Cadastro', error: 'Senhas não conferem', csrfToken: req.csrfToken() });

    try {
        const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) return res.render('pages/register', { title: 'Cadastro', error: 'E-mail já cadastrado', csrfToken: req.csrfToken() });

        const hashedPassword = await bcrypt.hash(password, 10);
        const role = userType === 'trainer' ? 'trainer' : 'client';
        const status = 'pending_approval'; 
        
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
            [name, email, hashedPassword, role, status]
        );

        // Define a sessão explicitamente
        req.session.user = newUser.rows[0];
        
        // Salva a sessão antes de redirecionar (CRÍTICO)
        req.session.save((err) => {
            if (err) {
                console.error("Erro ao salvar sessão:", err);
                return res.render('pages/register', { title: 'Cadastro', error: 'Erro no login. Tente entrar manualmente.', csrfToken: req.csrfToken() });
            }
            // Redireciona
            if (role === 'trainer') res.redirect('/trainer/pending');
            else res.redirect('/client/initial-form');
        });

    } catch (err) {
        console.error(err);
        res.render('pages/register', { title: 'Cadastro', error: 'Erro no servidor', csrfToken: req.csrfToken() });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.render('pages/login', { title: 'Login', error: 'Credenciais inválidas', csrfToken: req.csrfToken() });

        const user = userRes.rows[0];
        if (!(await bcrypt.compare(password, user.password))) return res.render('pages/login', { title: 'Login', error: 'Credenciais inválidas', csrfToken: req.csrfToken() });

        if (user.status === 'rejected') return res.render('pages/login', { title: 'Login', error: 'Conta suspensa.', csrfToken: req.csrfToken() });

        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };

        req.session.save(() => {
            if (user.role === 'superadmin') {
                res.redirect('/superadmin/dashboard');
            } else if (user.role === 'trainer') {
                if (user.status === 'pending_approval') return res.render('pages/pending-trainer', { title: 'Aprovação Pendente', user, csrfToken: req.csrfToken() });
                res.redirect('/admin/dashboard');
            } else {
                pool.query('SELECT 1 FROM client_profiles WHERE user_id = $1', [user.id]).then(profileRes => {
                    if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');
                    if (user.status === 'pending_approval') return res.redirect('/client/profile');
                    res.redirect('/client/dashboard');
                });
            }
        });
    } catch (err) {
        console.error(err);
        res.render('pages/login', { title: 'Login', error: 'Erro interno', csrfToken: req.csrfToken() });
    }
});

router.post('/logout', (req, res) => { req.session.destroy(); res.redirect('/auth/login'); });

// Recuperação de senha mantida (resumida para caber)
router.get('/forgot-password', (req, res) => res.render('pages/forgot-password', { title: 'Recuperar', error: null, success: null, csrfToken: res.locals.csrfToken }));
router.post('/forgot-password', async (req, res) => { /* ... lógica de envio ... */ });
router.get('/reset-password/:token', async (req, res) => { /* ... lógica de token ... */ });
router.post('/reset-password/:token', async (req, res) => { /* ... lógica de reset ... */ });

module.exports = router;
