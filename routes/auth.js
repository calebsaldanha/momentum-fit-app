const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');
const notificationService = require('../utils/notificationService');

// Função auxiliar centralizada para redirecionamento
const handleRedirect = (user, res) => {
    if (user.role === 'client') {
        return res.redirect('/client/dashboard');
    }
    if (user.role === 'superadmin') {
        return res.redirect('/superadmin/dashboard');
    }
    if (user.role === 'trainer') {
        if (user.status === 'active') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/trainer/profile');
        }
    }
    // Fallback
    return res.redirect('/');
};

router.get('/login', (req, res) => {
    if (req.session.user) return handleRedirect(req.session.user, res);
    res.render('pages/login', { error: null, title: 'Login - Momentum Fit' });
});

router.get('/register', (req, res) => {
    if (req.session.user) return handleRedirect(req.session.user, res);
    res.render('pages/register', { error: null, title: 'Cadastro - Momentum Fit' });
});

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.render('pages/login', { error: 'Dados inválidos.', title: 'Login' });

    const { email, password } = req.body;
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.render('pages/login', { error: 'Credenciais inválidas.', title: 'Login' });
        }
        
        // Configura sessão
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        };

        req.session.save(async (err) => {
            if (err) return res.render('pages/login', { error: 'Erro de sessão.', title: 'Login' });

            // Verificação especial para clientes sem perfil
            if (user.role === 'client') {
                const profileCheck = await pool.query('SELECT 1 FROM client_profiles WHERE user_id = $1', [user.id]);
                if (profileCheck.rows.length === 0) return res.redirect('/client/initial-form');
            }

            return handleRedirect(user, res);
        });

    } catch (err) {
        console.error(err);
        res.render('pages/login', { error: 'Erro interno.', title: 'Login' });
    }
});

router.post('/register', [
    body('name').notEmpty().trim(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('userType').isIn(['client', 'trainer'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.render('pages/register', { error: errors.array()[0].msg, title: 'Cadastro' });

    const { name, email, password, userType } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const role = userType === 'trainer' ? 'trainer' : 'client';
        const status = role === 'trainer' ? 'pending' : 'active';
        
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
            [name, email, hashedPassword, role, status]
        );
        const userId = result.rows[0].id;

        // Notificações
        if (role === 'client') notificationService.notifyNewClient(name, userId).catch(console.error);
        if (role === 'trainer') notificationService.notifyNewTrainer(name).catch(console.error);

        // Login automático
        req.session.user = { id: userId, name, email, role, status };
        
        req.session.save(() => {
            if (role === 'client') return res.redirect('/client/initial-form');
            return res.redirect('/trainer/profile');
        });

    } catch (err) {
        if (err.code === '23505') return res.render('pages/register', { error: 'E-mail já cadastrado.', title: 'Cadastro' });
        res.render('pages/register', { error: 'Erro no servidor.', title: 'Cadastro' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
