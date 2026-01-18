const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// --- LOGIN ---
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/client/dashboard');
    res.render('pages/login', { csrfToken: req.csrfToken(), messages: req.flash() });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
            
            // Redirecionamento inteligente
            if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
            if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
            return res.redirect('/client/dashboard');
        } else {
            req.flash('error', 'Credenciais inválidas.');
            res.redirect('/auth/login');
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro no servidor.');
        res.redirect('/auth/login');
    }
});

// --- REGISTER ---
router.get('/register', (req, res) => {
    res.render('pages/register', { csrfToken: req.csrfToken(), messages: req.flash() });
});

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            req.flash('error', 'Email já cadastrado.');
            return res.redirect('/auth/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.query('BEGIN');
        const userRes = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, hashedPassword, role]
        );
        const userId = userRes.rows[0].id;

        if (role === 'client') await db.query('INSERT INTO clients (user_id) VALUES ($1)', [userId]);
        else if (role === 'trainer') await db.query('INSERT INTO trainers (user_id) VALUES ($1)', [userId]);

        await db.query('COMMIT');
        req.flash('success', 'Conta criada! Faça login.');
        res.redirect('/auth/login');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro ao registrar.');
        res.redirect('/auth/register');
    }
});

// --- RECUPERAÇÃO DE SENHA (NOVAS ROTAS) ---
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { csrfToken: req.csrfToken(), messages: req.flash() });
});

router.post('/forgot-password', (req, res) => {
    // Aqui entraria a lógica de envio de email
    req.flash('success', 'Se o email existir, enviamos um link de redefinição.');
    res.redirect('/auth/login');
});

router.get('/reset-password', (req, res) => {
    res.render('pages/reset-password', { csrfToken: req.csrfToken(), messages: req.flash() });
});

// --- LOGOUT ---
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
});

module.exports = router;
