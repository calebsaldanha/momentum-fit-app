const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const notificationService = require('../utils/notificationService');

// GET Login/Logout mantidos...
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect(req.session.user.role === 'client' ? '/client/dashboard' : '/trainer/dashboard');
    res.render('pages/login');
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                if (user.status === 'suspended' || user.status === 'rejected') {
                    req.flash('error', 'Conta suspensa ou rejeitada.');
                    return res.redirect('/auth/login');
                }
                await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
                req.session.user = user;
                if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
                if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
                return res.redirect('/client/dashboard');
            }
        }
        req.flash('error', 'Credenciais inválidas');
        res.redirect('/auth/login');
    } catch (err) { res.redirect('/auth/login'); }
});

router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
router.get('/register', (req, res) => { res.render('pages/register', { plan: req.query.plan || '' }); });

// POST Register (Com Notificações Completas)
router.post('/register', async (req, res) => {
    const { name, email, password, role, plan } = req.body;
    try {
        await db.query('BEGIN');
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) { await db.query('ROLLBACK'); req.flash('error', 'E-mail já existe.'); return res.redirect('/auth/register'); }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Cliente começa ativo (mas precisa pagar), Trainer pendente
        const status = role === 'trainer' ? 'pending_approval' : 'active'; 
        
        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
            [name, email, hashedPassword, role, status]
        );
        const user = newUser.rows[0];

        // Cria tabelas auxiliares
        if (role === 'client') {
            await db.query('INSERT INTO clients (user_id) VALUES ($1)', [user.id]);
            // Lógica de Plano (Simplificada para brevidade, assumindo que funciona como antes)
            let planId = 1; // Default
            if (plan) { const p = await db.query("SELECT id FROM plans WHERE name ILIKE $1", [plan]); if(p.rows.length) planId = p.rows[0].id; }
            await db.query("INSERT INTO subscriptions (user_id, plan_id, status, start_date) VALUES ($1, $2, 'active', NOW())", [user.id, planId]);
        } else if (role === 'trainer') {
            await db.query('INSERT INTO trainers (user_id) VALUES ($1)', [user.id]);
        }

        // NOTIFICAÇÕES:
        // 1. Para o Admin (Novo Cliente ou Personal - Ambos requerem atenção)
        await notificationService.notify({
            userId: 'ADMIN_GROUP',
            type: 'new_user_admin',
            title: `Novo Registro: ${role}`,
            message: `${name} acabou de se cadastrar como ${role}.`,
            link: `/admin/users/${user.id}`,
            data: { name: user.name, role: user.role }
        });

        // 2. Para o Usuário
        await notificationService.notify({
            userId: user.id,
            type: status === 'active' ? 'welcome_active' : 'welcome_pending',
            title: 'Bem-vindo ao Momentum Fit',
            message: status === 'active' ? 'Complete seu perfil.' : 'Seu cadastro está em análise.',
            link: role === 'client' ? '/client/profile' : '/trainer/dashboard',
            data: { name: user.name }
        });

        await db.query('COMMIT');
        req.session.user = user;
        
        // Redireciona para completar perfil se for cliente
        if (role === 'client') return res.redirect('/client/profile');
        res.redirect('/trainer/dashboard');

    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro no cadastro.');
        res.redirect('/auth/register');
    }
});

module.exports = router;
