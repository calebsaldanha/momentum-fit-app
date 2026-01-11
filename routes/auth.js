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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir Usuário
        db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
            [name, email, hashedPassword, role], 
            function(err) {
                if (err) {
                    console.error("Erro registro user:", err.message);
                    return res.render('pages/register', { error: 'Email já cadastrado.', user: null });
                }
                
                const newUserId = this.lastID;

                // Se for Cliente, cria entrada na tabela clients imediatamente
                if (role === 'client') {
                    db.run(`INSERT INTO clients (user_id) VALUES (?)`, [newUserId], (err) => {
                        if (err) console.error("Erro ao criar vinculo client:", err);
                    });
                } 
                // Se for Treinador, cria entrada na tabela trainers
                else if (role === 'trainer') {
                    db.run(`INSERT INTO trainers (user_id) VALUES (?)`, [newUserId], (err) => {
                        if (err) console.error("Erro ao criar vinculo trainer:", err);
                    });
                }

                res.redirect('/auth/login?registered=true');
            }
        );
    } catch (error) {
        console.error(error);
        res.render('pages/register', { error: 'Erro no servidor.', user: null });
    }
});

// POST Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) {
            return res.render('pages/login', { error: 'Usuário não encontrado.', user: null });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = { id: user.id, name: user.name, role: user.role, email: user.email };
            
            // Atualiza last_login
            db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

            if (user.role === 'admin') return res.redirect('/admin/dashboard');
            if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
            return res.redirect('/client/dashboard');
        } else {
            res.render('pages/login', { error: 'Senha incorreta.', user: null });
        }
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
