const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// --- LOGIN ---
router.get('/login', (req, res) => {
    res.render('pages/login', { 
        title: 'Login', 
        csrfToken: req.csrfToken(), 
        error: req.query.error,
        success: req.query.success
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Usa query direta para evitar dependência de helper se algo mudar
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('pages/login', { 
                title: 'Login', error: 'Credenciais inválidas.', csrfToken: req.csrfToken() 
            });
        }

        // Setup Session
        req.session.user = { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            profile_image: user.profile_image 
        };
        
        // Atualiza ultimo login
        try { await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]); } catch(e){}

        // Redirecionamento Inteligente
        if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
        if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
        return res.redirect('/client/dashboard');

    } catch (e) {
        console.error("Login Error:", e);
        res.render('pages/login', { title: 'Login', error: 'Erro de conexão. Tente mais tarde.', csrfToken: req.csrfToken() });
    }
});

// --- REGISTER ---
router.get('/register', async (req, res) => {
    try {
        const trainers = await db.getAllTrainers();
        res.render('pages/register', { title: 'Cadastro', trainers: trainers, csrfToken: req.csrfToken() });
    } catch (e) {
        res.render('pages/register', { title: 'Cadastro', trainers: [], csrfToken: req.csrfToken() });
    }
});

router.post('/register', async (req, res) => {
    const { name, email, password, role, trainer_id } = req.body;
    try {
        const check = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            const trainers = await db.getAllTrainers();
            return res.render('pages/register', { title: 'Cadastro', error: 'E-mail já cadastrado.', trainers, csrfToken: req.csrfToken() });
        }

        const hash = await bcrypt.hash(password, 10);
        
        // Transaction simples
        const userRes = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id", 
            [name, email, hash, role || 'client']
        );
        const newUserId = userRes.rows[0].id;

        if (role === 'trainer') {
            await db.query("INSERT INTO trainers (user_id) VALUES ($1)", [newUserId]);
        } else {
            await db.query("INSERT INTO clients (user_id, trainer_id) VALUES ($1, $2)", [newUserId, trainer_id || null]);
        }

        res.redirect('/auth/login?success=Conta criada com sucesso! Faça login.');

    } catch (e) {
        console.error("Register Error:", e);
        const trainers = await db.getAllTrainers();
        res.render('pages/register', { 
            title: 'Cadastro', 
            error: 'Erro no cadastro. Verifique os dados.', 
            trainers, 
            csrfToken: req.csrfToken() 
        });
    }
});

// --- LOGOUT ---
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- ESQUECEU SENHA ---
router.get('/forgot-password', (req, res) => res.render('pages/forgot-password', { title: 'Recuperar Senha', csrfToken: req.csrfToken() }));
router.post('/forgot-password', (req, res) => res.redirect('/auth/login?success=Verifique seu e-mail para instruções.'));

module.exports = router;
