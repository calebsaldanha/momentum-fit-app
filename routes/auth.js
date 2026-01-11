const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const router = express.Router();

// GET Login
router.get('/login', (req, res) => {
    res.render('pages/login', { user: null });
});

// GET Register
router.get('/register', (req, res) => {
    res.render('pages/register', { user: null });
});

// POST Register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    
    // Validação básica
    if (!name || !email || !password || !role) {
        return res.render('pages/register', { error: 'Preencha todos os campos.', user: null });
    }

    try {
        // A função createUser do db.js já faz o hash da senha
        const newUser = await db.createUser({ name, email, password, role });

        if (newUser) {
            // Se for Cliente, cria entrada na tabela clients
            if (role === 'client') {
                await db.query('INSERT INTO clients (user_id) VALUES ($1)', [newUser.id]);
            } 
            // Se for Treinador, cria entrada na tabela trainers
            else if (role === 'trainer') {
                await db.query('INSERT INTO trainers (user_id) VALUES ($1)', [newUser.id]);
            }

            res.redirect('/auth/login?registered=true');
        }
    } catch (error) {
        console.error("Erro registro user:", error);
        // Código de erro Postgres para violação de unicidade (email duplicado)
        if (error.code === '23505') {
            return res.render('pages/register', { error: 'Email já cadastrado.', user: null });
        }
        res.render('pages/register', { error: 'Erro no servidor.', user: null });
    }
});

// POST Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.getUserByEmail(email);

        if (!user) {
            return res.render('pages/login', { error: 'Usuário não encontrado.', user: null });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = { id: user.id, name: user.name, role: user.role, email: user.email };
            
            // Atualiza last_login
            await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

            if (user.role === 'admin') return res.redirect('/admin/dashboard');
            if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
            return res.redirect('/client/dashboard');
        } else {
            res.render('pages/login', { error: 'Senha incorreta.', user: null });
        }
    } catch (err) {
        console.error(err);
        res.render('pages/login', { error: 'Erro ao realizar login.', user: null });
    }
});

// Logout (POST)
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("Erro ao destruir sessão:", err);
        res.redirect('/');
    });
});

module.exports = router;
