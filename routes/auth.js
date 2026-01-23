const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// --- LOGIN ---
router.get('/login', (req, res) => {
    // Se já estiver logado, redireciona
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'trainer' ? '/trainer/dashboard' : '/client/dashboard');
    }
    res.render('pages/login', { 
        title: 'Entrar',
        path: '/auth/login',
        query: req.query // Passando query params se houver
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                req.session.user = user;
                
                // Atualizar Last Login (Silent fail se coluna nao existir ainda em prod)
                try { await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]); } catch(e){}

                // Redirecionamento baseado na role
                if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
                if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
                return res.redirect('/client/dashboard');
            }
        }
        req.flash('error', 'Email ou senha inválidos.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro no servidor.');
        res.redirect('/auth/login');
    }
});

// --- REGISTER ---
router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    
    res.render('pages/register', { 
        title: 'Criar Conta',
        path: '/auth/register',
        query: req.query // Importante: Passa ?role=trainer ou ?plan=free
    });
});

router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword, role } = req.body;
    
    // Validação básica
    if (password !== confirmPassword) {
        req.flash('error', 'As senhas não coincidem.');
        // Mantém a query string no redirect para não perder o contexto (ex: role=trainer)
        const roleParam = role === 'trainer' ? '?role=trainer' : '';
        return res.redirect('/auth/register' + roleParam);
    }

    try {
        // Verifica duplicidade
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            req.flash('error', 'Email já cadastrado.');
            const roleParam = role === 'trainer' ? '?role=trainer' : '';
            return res.redirect('/auth/register' + roleParam);
        }

        // Hash
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Define role (segurança: garante que só aceita client ou trainer, padrão client)
        const finalRole = (role === 'trainer') ? 'trainer' : 'client';
        
        // Status: Cliente entra ativo, Trainer entra pendente (se houver lógica de aprovação)
        // Por enquanto, deixaremos ambos ativos para facilitar o teste, ou trainer pendente se preferir
        const status = 'active'; 

        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
            [name, email, hashedPassword, finalRole, status]
        );

        // Se for cliente, criar registro na tabela clients
        if (finalRole === 'client') {
            await db.query('INSERT INTO clients (user_id) VALUES ($1)', [newUser.rows[0].id]);
        }
        
        // Se for trainer, criar registro na tabela trainers
        if (finalRole === 'trainer') {
            await db.query('INSERT INTO trainers (user_id, bio) VALUES ($1, $2)', [newUser.rows[0].id, 'Perfil em construção']);
        }

        // Login automático
        req.session.user = newUser.rows[0];
        
        req.flash('success', 'Conta criada com sucesso! Complete seu perfil.');
        
        if (finalRole === 'trainer') return res.redirect('/trainer/settings'); // Manda para settings para completar perfil
        res.redirect('/client/settings'); // Manda para settings/anamnese

    } catch (err) {
        console.error("Erro no registro:", err);
        req.flash('error', 'Erro ao criar conta. Tente novamente.');
        res.redirect('/auth/register');
    }
});

// --- LOGOUT ---
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- FORGOT PASSWORD (Placeholder) ---
router.get('/forgot-password', (req, res) => {
    res.render('pages/forgot-password', { title: 'Recuperar Senha', path: '/auth/forgot' });
});

module.exports = router;
