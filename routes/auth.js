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
        // MUDANÇA: Todos (Client e Trainer) começam pendentes
        const status = 'pending_approval'; 
        
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
            [name, email, hashedPassword, role, status]
        );

        req.session.user = newUser.rows[0];
        
        if (role === 'trainer') res.redirect('/trainer/pending');
        else res.redirect('/client/initial-form'); // Cliente vai pro form

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

        if (user.role === 'admin' || user.role === 'superadmin') res.redirect('/superadmin/dashboard');
        else if (user.role === 'trainer') {
            if (user.status === 'pending_approval') return res.redirect('/trainer/pending');
            res.redirect('/trainer/dashboard');
        } else {
            // Se cliente pendente, vai pro perfil ver status, se não tiver perfil, vai pro form
            const profileRes = await pool.query('SELECT 1 FROM client_profiles WHERE user_id = $1', [user.id]);
            if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');
            
            // Redireciona para perfil se pendente, ou dashboard se ativo
            if (user.status === 'pending_approval') res.redirect('/client/profile');
            else res.redirect('/client/dashboard');
        }
    } catch (err) {
        console.error(err);
        res.render('pages/login', { title: 'Login', error: 'Erro interno', csrfToken: req.csrfToken() });
    }
});

router.post('/logout', (req, res) => { req.session.destroy(); res.redirect('/auth/login'); });

// ... Rotas de senha mantidas iguais (omiti para brevidade, mas elas existem no arquivo original)
// REINCLUINDO AS ROTAS DE SENHA PARA NÃO QUEBRAR O ARQUIVO:
router.get('/forgot-password', (req, res) => res.render('pages/forgot-password', { title: 'Recuperar', error: null, success: null, csrfToken: res.locals.csrfToken }));
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length > 0) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 3600000); 
            await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', [token, expires, userRes.rows[0].id]);
            await sendPasswordResetEmail(userRes.rows[0].email, token, req.headers.host);
        }
        res.render('pages/forgot-password', { title: 'Recuperar', error: null, success: 'Email enviado.', csrfToken: req.csrfToken() });
    } catch (err) { res.render('pages/forgot-password', { title: 'Erro', error: 'Erro.', success: null, csrfToken: req.csrfToken() }); }
});
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const userRes = await pool.query('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
    if (userRes.rows.length === 0) return res.redirect('/auth/forgot-password');
    res.render('pages/reset-password', { title: 'Nova Senha', token, error: null, csrfToken: res.locals.csrfToken });
});
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.render('pages/reset-password', { title: 'Nova Senha', token, error: 'Senhas não conferem', csrfToken: req.csrfToken() });
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
        if (userRes.rows.length === 0) return res.redirect('/auth/forgot-password');
        const hashed = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', [hashed, userRes.rows[0].id]);
        res.render('pages/login', { title: 'Login', error: null, success: 'Senha alterada.', csrfToken: req.csrfToken() });
    } catch (err) { res.redirect('/auth/forgot-password'); }
});

module.exports = router;
