const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../database/db');
const { sendPasswordResetEmail } = require('../utils/emailService');

// --- Renderizar Login ---
router.get('/login', (req, res) => {
    res.render('pages/login', { 
        title: 'Login - Momentum Fit', 
        error: null,
        csrfToken: res.locals.csrfToken 
    });
});

// --- Renderizar Cadastro ---
router.get('/register', (req, res) => {
    res.render('pages/register', { 
        title: 'Cadastro - Momentum Fit', 
        error: null,
        csrfToken: res.locals.csrfToken
    });
});

// --- Processar Cadastro ---
router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, userType } = req.body;

    if (password !== confirmPassword) {
        return res.render('pages/register', { title: 'Cadastro', error: 'Senhas não conferem', csrfToken: req.csrfToken() });
    }

    try {
        // Verificar se usuário existe
        const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.render('pages/register', { title: 'Cadastro', error: 'E-mail já cadastrado', csrfToken: req.csrfToken() });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Inserir usuário
        const role = userType === 'trainer' ? 'trainer' : 'client';
        const status = role === 'trainer' ? 'pending_approval' : 'active';
        
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
            [name, email, hashedPassword, role, status]
        );

        // Sessão automática
        req.session.user = newUser.rows[0];
        
        // Redirecionamento baseado no role
        if (role === 'trainer') {
            res.redirect('/trainer/dashboard');
        } else {
            res.redirect('/client/initial-form');
        }

    } catch (err) {
        console.error(err);
        res.render('pages/register', { title: 'Cadastro', error: 'Erro no servidor', csrfToken: req.csrfToken() });
    }
});

// --- Processar Login ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userRes.rows.length === 0) {
            return res.render('pages/login', { title: 'Login', error: 'Credenciais inválidas', csrfToken: req.csrfToken() });
        }

        const user = userRes.rows[0];

        // Verificar Senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.render('pages/login', { title: 'Login', error: 'Credenciais inválidas', csrfToken: req.csrfToken() });
        }

        // Verificar Status
        if (user.status === 'rejected') {
            return res.render('pages/login', { title: 'Login', error: 'Conta suspensa ou rejeitada.', csrfToken: req.csrfToken() });
        }
        
        // Configurar Sessão
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        };

        // Redirecionamento
        if (user.role === 'admin' || user.role === 'superadmin') {
            res.redirect('/superadmin/dashboard');
        } else if (user.role === 'trainer') {
            if (user.status === 'pending_approval') return res.redirect('/trainer/pending');
            res.redirect('/trainer/dashboard');
        } else {
            // Verificar se o cliente preencheu o perfil
            const profileRes = await pool.query('SELECT 1 FROM client_profiles WHERE user_id = $1', [user.id]);
            if (profileRes.rows.length === 0) return res.redirect('/client/initial-form');
            res.redirect('/client/dashboard');
        }

    } catch (err) {
        console.error(err);
        res.render('pages/login', { title: 'Login', error: 'Erro interno', csrfToken: req.csrfToken() });
    }
});

// --- Logout ---
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

// ==========================================
// SISTEMA DE RECUPERAÇÃO DE SENHA
// ==========================================

// 1. Tela de Solicitação
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { 
        title: 'Recuperar Senha', 
        error: null, 
        success: null, 
        csrfToken: res.locals.csrfToken 
    });
});

// 2. Processar Solicitação e Enviar Email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        // Por segurança, não informamos se o email existe ou não, apenas damos msg de sucesso
        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            
            // Gerar Token (Hex 32 bytes)
            const token = crypto.randomBytes(32).toString('hex');
            // Validade de 1 hora
            const expires = new Date(Date.now() + 3600000); 

            // Salvar no Banco
            await pool.query(
                'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
                [token, expires, user.id]
            );

            // Enviar Email
            // req.headers.host pega o domínio atual (localhost ou vercel)
            await sendPasswordResetEmail(user.email, token, req.headers.host);
        }

        res.render('pages/forgot-password', { 
            title: 'Recuperar Senha', 
            error: null, 
            success: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.',
            csrfToken: req.csrfToken()
        });

    } catch (err) {
        console.error(err);
        res.render('pages/forgot-password', { title: 'Erro', error: 'Erro ao processar solicitação.', success: null, csrfToken: req.csrfToken() });
    }
});

// 3. Tela de Redefinição (Link do Email)
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    try {
        // Verificar se token existe e não expirou
        const userRes = await pool.query(
            'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.render('pages/forgot-password', { 
                title: 'Erro', 
                error: 'O link de recuperação é inválido ou expirou.', 
                success: null, 
                csrfToken: res.locals.csrfToken 
            });
        }

        res.render('pages/reset-password', { 
            title: 'Nova Senha', 
            token: token, 
            error: null, 
            csrfToken: res.locals.csrfToken 
        });

    } catch (err) {
        console.error(err);
        res.redirect('/auth/forgot-password');
    }
});

// 4. Processar Nova Senha
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('pages/reset-password', { 
            title: 'Nova Senha', 
            token, 
            error: 'As senhas não conferem.', 
            csrfToken: req.csrfToken() 
        });
    }

    try {
        const userRes = await pool.query(
            'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.render('pages/forgot-password', { 
                title: 'Erro', 
                error: 'Token inválido ou expirado.', 
                success: null,
                csrfToken: req.csrfToken()
            });
        }

        const user = userRes.rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        // Atualizar senha e limpar tokens
        await pool.query(
            'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.render('pages/login', { 
            title: 'Login', 
            error: null, 
            success: 'Senha alterada com sucesso! Faça login.', // Opcional: passar msg de sucesso pro login
            csrfToken: req.csrfToken() 
        });

    } catch (err) {
        console.error(err);
        res.render('pages/reset-password', { title: 'Erro', token, error: 'Erro ao redefinir senha.', csrfToken: req.csrfToken() });
    }
});

module.exports = router;
