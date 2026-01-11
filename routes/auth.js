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
            
            // Atualizar last_login
            try { await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]); } catch (e) {}

            if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
            if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
            
            // Se for cliente, verificar se precisa preencher anamnese
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

// Processar Registro com LOGIN AUTOMÁTICO e REDIRECIONAMENTO
router.post('/register', async (req, res) => {
    // Adicionado confirmPassword na desestruturação
    const { name, email, password, confirmPassword, trainer_id, role, height, weight, goal, fitness_level } = req.body;
    
    try {
        // Validação de Senha (Correção Senior)
        if (password !== confirmPassword) {
            const trainers = await db.getAllTrainers();
            return res.render('pages/register', { title: 'Criar Conta', trainers, error: 'As senhas não coincidem.' });
        }

        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            const trainers = await db.getAllTrainers();
            return res.render('pages/register', { title: 'Criar Conta', trainers, error: 'Email já cadastrado.' });
        }

        // 1. Criar Usuário
        const newUser = await db.createUser({
            name, email, password, 
            role: role || 'client',
            trainer_id: trainer_id || null,
            profile_image: null
        });

        // 2. Criar entrada na tabela clients ou trainers
        if (newUser.role === 'client') {
            await db.query(`
                INSERT INTO clients (user_id, height, current_weight, fitness_goals, fitness_level)
                VALUES ($1, $2, $3, $4, $5)
            `, [newUser.id, height || null, weight || null, goal || null, fitness_level || null]);

            // === LÓGICA DE LOGIN AUTOMÁTICO ===
            req.session.user = newUser;
            req.session.save((err) => {
                if (err) {
                    console.error("Erro ao salvar sessão:", err);
                    return res.redirect('/auth/login');
                }
                // === REDIRECIONAR PARA O FORMULÁRIO INICIAL ===
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
        const trainers = await db.getAllTrainers(); // Recarrega treinadores em caso de erro
        res.render('pages/register', { title: 'Criar Conta', trainers, error: 'Erro ao criar conta. Tente novamente.' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;
