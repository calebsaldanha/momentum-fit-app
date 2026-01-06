const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendWelcomeEmail, sendNewClientNotification } = require('../utils/emailService');

// --- LOGIN ---
router.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login', bodyClass: 'login-body' });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.getUserByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            
            if (user.status === 'suspended') {
                return res.render('pages/login', { error: 'Conta suspensa. Contate o suporte.', title: 'Login', bodyClass: 'login-body' });
            }

            // Atualiza último login
            await db.pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

            req.session.user = user;
            
            // Redirecionamento baseado no cargo
            if (user.role === 'superadmin' || user.role === 'trainer') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/client/dashboard');
            }
        }
        res.render('pages/login', { error: 'Credenciais inválidas', title: 'Login', bodyClass: 'login-body' });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro no servidor' });
    }
});

// --- REGISTER (AUTO-CADASTRO CLIENTE) ---
router.get('/register', (req, res) => {
    res.render('pages/register', { title: 'Cadastro', bodyClass: 'login-body' });
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.render('pages/register', { error: 'Email já cadastrado', title: 'Cadastro', bodyClass: 'login-body' });
        }

        // Cria o usuário com role 'client'
        const newUser = await db.createUser({
            name,
            email,
            password,
            role: 'client',
            trainer_id: null, // Será atribuído depois pelo admin
            profile_image: null,
            goal: '',
            fitness_level: '',
            height: null,
            weight: null
        });

        // Autentica o usuário imediatamente (Sessão)
        req.session.user = newUser;

        // --- DISPARO DE EMAILS (Non-blocking) ---
        // 1. Para o Cliente: Boas vindas com link para perfil
        sendWelcomeEmail(newUser.email, newUser.name, req.headers.host)
            .catch(err => console.error("Falha envio email boas vindas:", err));

        // 2. Para o Admin/Treinador: Aviso de novo aluno
        sendNewClientNotification(newUser.name, newUser.email)
            .catch(err => console.error("Falha envio notificação admin:", err));

        // --- REDIRECIONAMENTO ---
        // Vai direto para o formulário inicial (Anamnese)
        res.redirect('/client/initial-form');

    } catch (err) {
        console.error("Erro no registro:", err);
        res.render('pages/register', { error: 'Erro ao cadastrar. Tente novamente.', title: 'Cadastro', bodyClass: 'login-body' });
    }
});

// --- LOGOUT ---
// Adicionado suporte a POST para funcionar com os formulários de logout (recomendado para segurança/CSRF)
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Erro ao destruir sessão:', err);
        res.redirect('/auth/login');
    });
});

// Mantemos o GET como fallback, mas redirecionando para login também
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Erro ao destruir sessão:', err);
        res.redirect('/auth/login');
    });
});

// --- RECUPERAÇÃO DE SENHA ---
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: 'Recuperar Senha', bodyClass: 'login-body' });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await db.getUserByEmail(email);
        if (user) {
            const token = crypto.randomBytes(20).toString('hex');
            const expires = new Date(Date.now() + 3600000); // 1 hora
            
            await db.pool.query(
                "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
                [token, expires, user.id]
            );

            sendPasswordResetEmail(user.email, token, req.headers.host).catch(console.error);
        }
        // Sempre mostra msg de sucesso por segurança
        res.render('pages/forgot-password', { 
            message: 'Se o email existir, você receberá as instruções.', 
            title: 'Recuperar Senha', 
            bodyClass: 'login-body' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao processar.');
    }
});

router.get('/reset-password/:token', async (req, res) => {
    try {
        const resDb = await db.pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
            [req.params.token]
        );
        
        if (resDb.rows.length === 0) {
            return res.render('pages/error', { message: 'Token inválido ou expirado.' });
        }

        res.render('pages/reset-password', { 
            token: req.params.token, 
            title: 'Nova Senha',
            bodyClass: 'login-body'
        });
    } catch(err) {
        res.status(500).send("Erro interno");
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.pool.query(
            "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE reset_password_token = $2",
            [hashedPassword, req.params.token]
        );
        
        res.redirect('/auth/login');
    } catch (err) {
        res.status(500).send("Erro ao redefinir senha");
    }
});

module.exports = router;
