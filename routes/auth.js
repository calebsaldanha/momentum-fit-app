const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// Página de Login
router.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login', error: null, success: null });
});

// Processar Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.getUserByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            try { await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]); } catch (e) {}

            if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
            if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
            return res.redirect('/client/dashboard'); 
        } else {
            res.render('pages/login', { title: 'Login', error: 'Email ou senha incorretos.', success: null });
        }
    } catch (err) {
        console.error(err);
        res.render('pages/login', { title: 'Login', error: 'Erro no servidor.', success: null });
    }
});

// Página de Registro
router.get('/register', async (req, res) => {
    try {
        const trainers = await db.getAllTrainers();
        res.render('pages/register', { title: 'Criar Conta', trainers, error: null });
    } catch (err) {
        res.render('pages/register', { title: 'Criar Conta', trainers: [], error: 'Erro ao carregar treinadores.' });
    }
});

// Processar Registro
router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, trainer_id, role, height, weight, goal, fitness_level } = req.body;
    
    try {
        if (password !== confirmPassword) {
            const trainers = await db.getAllTrainers();
            return res.render('pages/register', { title: 'Criar Conta', trainers, error: 'As senhas não coincidem.' });
        }

        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            const trainers = await db.getAllTrainers();
            return res.render('pages/register', { title: 'Criar Conta', trainers, error: 'Email já cadastrado.' });
        }

        const newUser = await db.createUser({
            name, email, password, 
            role: role || 'client',
            trainer_id: trainer_id || null,
            profile_image: null
        });

        if (newUser.role === 'client') {
            await db.query(`
                INSERT INTO clients (user_id, height, current_weight, fitness_goals, fitness_level)
                VALUES ($1, $2, $3, $4, $5)
            `, [newUser.id, height || null, weight || null, goal || null, fitness_level || null]);

            req.session.user = newUser;
            req.session.save((err) => {
                if (err) return res.redirect('/auth/login');
                return res.redirect('/client/initial-form');
            });

        } else if (newUser.role === 'trainer') {
             await db.query(`INSERT INTO trainers (user_id) VALUES ($1)`, [newUser.id]);
             res.render('pages/login', { title: 'Login', error: null, success: 'Conta de treinador criada. Aguarde aprovação ou faça login.' });
        } else {
            res.render('pages/login', { title: 'Login', error: null, success: 'Conta criada com sucesso.' });
        }

    } catch (err) {
        console.error("Erro no registro:", err);
        const trainers = await db.getAllTrainers();
        res.render('pages/register', { title: 'Criar Conta', trainers, error: 'Erro ao criar conta. Tente novamente.' });
    }
});

// --- NOVAS ROTAS DE RECUPERAÇÃO DE SENHA ---

router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: 'Recuperar Senha', error: null, success: null, csrfToken: req.csrfToken() });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    // TODO: Implementar envio real de email com token
    // Por enquanto, simulamos o sucesso para não quebrar a UX
    console.log(`[SIMULAÇÃO] Email de recuperação solicitado para: ${email}`);
    
    res.render('pages/forgot-password', { 
        title: 'Recuperar Senha', 
        error: null, 
        success: 'Se o email existir, enviamos um link de recuperação.',
        csrfToken: req.csrfToken()
    });
});

router.get('/reset-password', (req, res) => {
    // Rota para onde o link do email apontaria
    res.render('pages/reset-password', { title: 'Redefinir Senha', error: null, token: req.query.token, csrfToken: req.csrfToken() });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;
