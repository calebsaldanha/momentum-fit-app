const express = require('express');
const router = express.Router();
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// --- LOGIN VIEW ---
router.get('/login', (req, res) => {
    res.render('pages/login', { 
        title: 'Login', 
        csrfToken: req.csrfToken(), 
        error: req.query.error,
        success: req.query.success
    });
});

// --- LOGIN POST (COM CORREÇÃO DE SESSÃO) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Busca usuário (query direta para segurança)
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        // Validação
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('pages/login', { 
                title: 'Login', 
                error: 'E-mail ou senha incorretos.', 
                csrfToken: req.csrfToken() 
            });
        }

        // Verifica se está ativo
        if (user.is_active === false) {
            return res.render('pages/login', { 
                title: 'Login', 
                error: 'Sua conta foi desativada.', 
                csrfToken: req.csrfToken() 
            });
        }

        // Configura Sessão
        req.session.user = { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role, // Certifique-se que no banco é 'admin' ou 'superadmin'
            profile_image: user.profile_image 
        };

        // Atualiza last_login sem esperar (fire and forget)
        db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]).catch(console.error);

        // --- SALVAR E REDIRECIONAR ---
        // Essencial: req.session.save garante que o dado foi pro Redis/Postgres
        // ANTES de navegador fazer a requisição da próxima página.
        req.session.save((err) => {
            if (err) {
                console.error("Erro ao salvar sessão:", err);
                return res.render('pages/login', { title: 'Login', error: 'Erro de sessão.', csrfToken: req.csrfToken() });
            }

            // Redirecionamento baseado em Role
            if (user.role === 'admin' || user.role === 'superadmin') {
                return res.redirect('/admin/dashboard');
            }
            if (user.role === 'trainer') {
                return res.redirect('/trainer/dashboard');
            }
            return res.redirect('/client/dashboard');
        });

    } catch (e) {
        console.error("Login Fatal Error:", e);
        res.render('pages/login', { 
            title: 'Login', 
            error: 'Erro interno no servidor. Tente novamente.', 
            csrfToken: req.csrfToken() 
        });
    }
});

// --- REGISTER ---
router.get('/register', async (req, res) => {
    try {
        const trainers = await db.getAllTrainers();
        res.render('pages/register', { title: 'Cadastro', trainers, csrfToken: req.csrfToken() });
    } catch (e) {
        res.render('pages/register', { title: 'Cadastro', trainers: [], csrfToken: req.csrfToken() });
    }
});

router.post('/register', async (req, res) => {
    const { name, email, password, role, trainer_id } = req.body;
    
    // Validação básica
    if (!name || !email || !password) {
        return res.redirect('/auth/register?error=Preencha todos os campos');
    }

    try {
        // Verifica duplicidade
        const check = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            const trainers = await db.getAllTrainers();
            return res.render('pages/register', { 
                title: 'Cadastro', 
                error: 'Este e-mail já está em uso.', 
                trainers, csrfToken: req.csrfToken() 
            });
        }

        const hash = await bcrypt.hash(password, 10);
        
        // Insere User
        const userRes = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id", 
            [name, email, hash, role || 'client']
        );
        const newUserId = userRes.rows[0].id;

        // Insere Perfil
        if (role === 'trainer') {
            await db.query("INSERT INTO trainers (user_id) VALUES ($1)", [newUserId]);
        } else {
            await db.query("INSERT INTO clients (user_id, trainer_id) VALUES ($1, $2)", [newUserId, trainer_id || null]);
        }

        res.redirect('/auth/login?success=Cadastro realizado! Faça login agora.');

    } catch (e) {
        console.error("Register Error:", e);
        res.redirect('/auth/register?error=Erro ao criar conta');
    }
});

// --- LOGOUT ---
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        // Limpa cookie do lado do cliente também
        res.clearCookie('connect.sid'); 
        res.redirect('/');
    });
});

// --- FORGOT PASSWORD (STUB) ---
router.get('/forgot-password', (req, res) => res.render('pages/forgot-password', { title: 'Recuperar Senha', csrfToken: req.csrfToken() }));
router.post('/forgot-password', (req, res) => res.redirect('/auth/login?success=Instruções enviadas (Simulação).'));

module.exports = router;
