const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { forwardAuthenticated } = require('../middleware/auth');

// --- LOGIN ---
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('pages/login', { title: 'Entrar' });
});

// Processar Login (Usando Passport com Callback Personalizado para Redirecionamento)
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            req.flash('error_msg', info.message || 'Credenciais inválidas');
            return res.redirect('/auth/login');
        }
        
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            
            // Redirecionamento Baseado no Role
            if (user.role === 'admin' || user.role === 'superadmin') {
                return res.redirect('/admin/dashboard');
            } else if (user.role === 'trainer') {
                return res.redirect('/trainer/dashboard');
            } else {
                return res.redirect('/client/dashboard');
            }
        });
    })(req, res, next);
});

// --- LOGOUT ---
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success_msg', 'Você saiu com sucesso.');
        res.redirect('/auth/login');
    });
});

// --- REGISTER (Mantido simples) ---
router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('pages/register', { title: 'Criar Conta' });
});

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    let errors = [];

    if (!name || !email || !password) errors.push({ msg: 'Preencha todos os campos' });
    if (password.length < 6) errors.push({ msg: 'Senha muito curta' });

    if (errors.length > 0) {
        return res.render('pages/register', { errors, name, email, role, title: 'Criar Conta' });
    }

    try {
        const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            errors.push({ msg: 'Email já cadastrado' });
            return res.render('pages/register', { errors, name, email, role, title: 'Criar Conta' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, hashedPassword, role || 'client']
        );
        
        // Cria perfil vazio ao registrar
        await db.query('INSERT INTO profiles (user_id) VALUES ($1)', [newUser.rows[0].id]);

        req.flash('success_msg', 'Cadastro realizado! Faça login.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.render('pages/register', { errors: [{ msg: 'Erro no servidor' }], title: 'Criar Conta' });
    }
});

// --- FORGOT PASSWORD (Visual apenas) ---
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: 'Recuperar Senha' });
});

module.exports = router;
