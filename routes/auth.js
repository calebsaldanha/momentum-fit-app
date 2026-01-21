const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const notificationService = require('../utils/notificationService');

// GET Login
router.get('/login', (req, res) => {
    res.render('pages/login', { csrfToken: 'token-mock-safe' }); 
});

// POST Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            if (await bcrypt.compare(password, user.password_hash)) {
                
                if (user.status === 'pending_approval') {
                    req.flash('error', 'Sua conta ainda está aguardando aprovação.');
                    return res.redirect('/auth/login');
                }
                if (user.status === 'rejected' || user.status === 'inactive') {
                    req.flash('error', 'Conta desativada ou rejeitada.');
                    return res.redirect('/auth/login');
                }

                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                // Redirecionamento por Role
                if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
                if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
                if (user.role === 'client') return res.redirect('/client/dashboard');
                
                return res.redirect('/');
            }
        }
        
        req.flash('error', 'Email ou senha inválidos.');
        res.redirect('/auth/login');

    } catch (err) {
        console.error("Login Error:", err);
        req.flash('error', 'Erro interno no servidor.');
        res.redirect('/auth/login');
    }
});

// GET Register
router.get('/register', (req, res) => {
    const plan = req.query.plan || 'free';
    res.render('pages/register', { plan, csrfToken: 'token-mock-safe' });
});

// POST Register
router.post('/register', async (req, res) => {
    const { name, email, password, role, plan } = req.body;
    const safeRole = (role === 'trainer') ? 'trainer' : 'client';
    const status = (safeRole === 'trainer') ? 'pending_approval' : 'active'; 

    try {
        const check = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            req.flash('error', 'Email já cadastrado.');
            return res.redirect('/auth/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role, status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [name, email, hashedPassword, safeRole, status]
        );

        const userId = result.rows[0].id;

        if (safeRole === 'client') {
            await db.query('INSERT INTO clients (user_id) VALUES ($1)', [userId]);
            // Correção aqui: createNotification
            try {
                await notificationService.createNotification(
                    null, 
                    'Novo Cliente', 
                    `${name} se cadastrou na plataforma.`,
                    '/admin/users'
                );
            } catch (nErr) { console.error("Erro notif:", nErr); }

        } else if (safeRole === 'trainer') {
            await db.query('INSERT INTO trainers (user_id) VALUES ($1)', [userId]);
            try {
                await notificationService.createNotification(
                    null, 
                    'Solicitação de Personal', 
                    `${name} solicitou acesso como treinador.`,
                    '/admin/approvals'
                );
            } catch (nErr) { console.error("Erro notif:", nErr); }
        }

        req.flash('success', 'Cadastro realizado! Faça login.');
        res.redirect('/auth/login');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro ao cadastrar.');
        res.redirect('/auth/register');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;
