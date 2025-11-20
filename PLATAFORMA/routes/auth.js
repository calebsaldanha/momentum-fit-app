const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../database/db');
const { body, validationResult } = require('express-validator');
const notificationService = require('../utils/notificationService');

const redirectToDashboard = (role, res) => {
    if (role === 'client') {
        return res.redirect('/client/dashboard');
    }
    return res.redirect('/admin/dashboard');
};

router.get('/login', (req, res) => {
    if (req.session.user) return redirectToDashboard(req.session.user.role, res);
    res.render('pages/login', { error: null, title: 'Login - Momentum Fit' });
});

router.get('/register', (req, res) => {
    if (req.session.user) return redirectToDashboard(req.session.user.role, res);
    res.render('pages/register', { error: null, title: 'Cadastro - Momentum Fit' });
});

router.post('/login', [
    body('email', 'Por favor, insira um e-mail válido.').isEmail().normalizeEmail(),
    body('password', 'A senha não pode estar vazia.').notEmpty()
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('pages/login', { 
            error: errors.array()[0].msg,
            title: 'Login - Momentum Fit' 
        });
    }

    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.render('pages/login', { error: 'E-mail ou senha incorretos.', title: 'Login - Momentum Fit' });
        }
        
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        };

        req.session.save(async (err) => {
            if (err) {
                console.error("Erro ao salvar a sessão:", err);
                return res.render('pages/login', { error: 'Ocorreu um erro ao iniciar sua sessão.', title: 'Login - Momentum Fit' });
            }
            if (user.role === 'client') {
                try {
                    const profileResult = await pool.query('SELECT 1 FROM client_profiles WHERE user_id = $1', [user.id]);
                    if (profileResult.rows.length === 0) {
                        return res.redirect('/client/initial-form');
                    }
                } catch (dbError) {
                     console.error("Erro ao checar perfil do cliente:", dbError);
                     return res.render('pages/login', { error: 'Ocorreu um erro ao carregar seu perfil.', title: 'Login - Momentum Fit' });
                }
            }
            if (user.role === 'client') { redirectToDashboard(user.role, res); } else if (user.role === 'trainer' || user.role === 'superadmin') { if (user.status === 'active') { redirectToDashboard(user.role, res); } else { res.redirect('/trainer/profile'); } } else { res.render('pages/login', { error: 'Status de conta inválido.', title: 'Login - Momentum Fit' }); }
        });
    } catch (err) {
        console.error("Erro no login:", err);
        res.render('pages/login', { error: 'Ocorreu um erro no servidor. Tente novamente.', title: 'Login - Momentum Fit' });
    }
});

router.post('/register', [
    body('name', 'O nome é obrigatório.').notEmpty().trim().escape(),
    body('email', 'Por favor, insira um e-mail válido.').isEmail().normalizeEmail(),
    body('password', 'A senha deve ter pelo menos 6 caracteres.').isLength({ min: 6 }),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('As senhas não coincidem.');
        }
        return true;
    }),
    body('userType', 'Tipo de conta inválido.').isIn(['client', 'trainer'])
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('pages/register', { 
            error: errors.array()[0].msg, 
            title: 'Cadastro - Momentum Fit' 
        });
    }

    const { name, email, password, userType } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const role = userType === 'trainer' ? 'trainer' : 'client';
        const status = role === 'trainer' ? 'pending' : 'active';
        
        // A tabela 'users' do Momentum Fit não tem a coluna 'pronouns'
        const query = 'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const result = await pool.query(query, [name, email, hashedPassword, role, status]);
        const userId = result.rows[0].id;

        req.session.user = { id: userId, name, email, role, status };

        if (role === 'client') {
            await notificationService.notifyNewClient(name, userId);
        } else if (role === 'trainer') {
            await notificationService.notifyNewTrainer(name);
        }

        req.session.save((err) => {
            if (err) {
                console.error("Erro ao salvar a sessão após registro:", err);
            }
            if (role === 'client') {
                res.redirect('/client/initial-form');
            } else {
                res.redirect('/trainer/profile'); 
            }
        });

    } catch (err) {
        if (err.code === '23505') {
            return res.render('pages/register', { error: 'Este e-mail já está cadastrado.', title: 'Cadastro - Momentum Fit' });
        }
        console.error('Erro ao registrar:', err);
        res.render('pages/register', { error: 'Ocorreu um erro no servidor. Tente novamente.', title: 'Cadastro - Momentum Fit' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Erro ao fazer logout:', err);
        res.redirect('/');
    });
});

module.exports = router;