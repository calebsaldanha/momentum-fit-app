const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // ALTERADO PARA BCRYPTJS
const db = require('../database/db');

router.get('/login', (req, res) => res.render('pages/login'));

router.get('/register', (req, res) => {
    res.render('pages/register', { plan: req.query.plan || 'free' });
});

router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, role, plan, paymentDay } = req.body;
    
    if (password !== confirmPassword) {
        return res.render('pages/register', { messages: { error: 'Senhas não conferem.' }, plan });
    }

    try {
        const exists = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (exists.rows.length > 0) return res.render('pages/register', { messages: { error: 'Email já existe.' }, plan });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role || 'client']
        );
        const user = newUser.rows[0];

        if (user.role === 'client') {
            await db.query("INSERT INTO clients (user_id) VALUES ($1)", [user.id]);
            
            const isPaid = plan === 'basic' || plan === 'pro';
            const price = plan === 'basic' ? 10.00 : (plan === 'pro' ? 89.90 : 0.00);
            const status = isPaid ? 'pending' : 'active';
            const planName = plan === 'basic' ? 'Momentum Básico' : (plan === 'pro' ? 'Momentum Pro' : 'Free');

            await db.query(
                "INSERT INTO subscriptions (user_id, plan_name, price, status, payment_due_day) VALUES ($1, $2, $3, $4, $5)",
                [user.id, planName, price, status, paymentDay || 10]
            );
        } else if (user.role === 'trainer') {
            await db.query("INSERT INTO trainers (user_id, is_approved) VALUES ($1, false)", [user.id]);
        }

        req.session.user = user;
        
        if (user.role === 'client') {
            res.redirect('/client/profile?first_login=true');
        } else {
            res.redirect('/trainer/profile');
        }

    } catch (err) {
        console.error("Erro no registro:", err);
        res.render('pages/register', { messages: { error: 'Erro técnico no cadastro.' }, plan });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (!user.active) return res.render('pages/login', { messages: { error: 'Conta suspensa.' } });
            
            if (await bcrypt.compare(password, user.password)) {
                req.session.user = user;
                if (user.role.includes('admin')) return res.redirect('/admin/dashboard');
                if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
                return res.redirect('/client/dashboard');
            }
        }
        res.render('pages/login', { messages: { error: 'Dados inválidos.' } });
    } catch (e) { res.render('pages/login', { messages: { error: 'Erro técnico.' } }); }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
