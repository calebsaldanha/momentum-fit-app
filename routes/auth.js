const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { sendNewUserEmail } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationService');

// GET Login
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect(req.session.user.role === 'client' ? '/client/dashboard' : '/trainer/dashboard');
    res.render('pages/login');
});

// POST Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                if (user.status === 'suspended' || user.status === 'rejected') {
                    req.flash('error', 'Conta suspensa ou não aprovada. Contate o suporte.');
                    return res.redirect('/auth/login');
                }

                // Atualizar último login
                await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

                req.session.user = user;
                
                // Redirecionamento baseado em Role
                if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
                if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
                
                // Verificar se o cliente já preencheu a anamnese
                const clientProfile = await db.query('SELECT goal FROM clients WHERE user_id = $1', [user.id]);
                if (clientProfile.rows.length === 0 || !clientProfile.rows[0].goal) {
                    return res.redirect('/client/profile'); // Força anamnese
                }
                
                return res.redirect('/client/dashboard');
            }
        }
        
        req.flash('error', 'Credenciais inválidas');
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Erro interno no servidor');
        res.redirect('/auth/login');
    }
});

// GET Register
router.get('/register', (req, res) => {
    const plan = req.query.plan || 'Free'; // Default para Free se não vier nada
    res.render('pages/register', { plan: plan });
});

// POST Register (Com validação e fluxo corrigido)
router.post('/register', async (req, res) => {
    const { name, email, password, confirm_password, role, plan } = req.body;
    
    // 1. Validação de Senha Backend
    if (password.length < 6) {
        req.flash('error', 'A senha deve ter no mínimo 6 caracteres.');
        return res.redirect(`/auth/register?plan=${plan}`);
    }
    if (password !== confirm_password) {
        req.flash('error', 'As senhas não coincidem.');
        return res.redirect(`/auth/register?plan=${plan}`);
    }

    try {
        await db.query('BEGIN');

        // 2. Verificar duplicação
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            await db.query('ROLLBACK');
            req.flash('error', 'E-mail já cadastrado.');
            return res.redirect('/auth/register');
        }

        // 3. Criar Usuário
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role === 'trainer' ? 'trainer' : 'client';
        const userStatus = userRole === 'trainer' ? 'pending_approval' : 'active';
        
        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, role, name, email',
            [name, email, hashedPassword, userRole, userStatus]
        );
        const user = newUser.rows[0];

        // 4. Configurar Perfil e Plano
        if (userRole === 'client') {
            await db.query('INSERT INTO clients (user_id) VALUES ($1)', [user.id]);
            
            // Lógica de Plano Selecionado
            let planRes;
            if (plan) {
                // Tenta buscar o plano pelo nome exato vindo do form (ex: "Premium", "Pro")
                planRes = await db.query("SELECT id, price, name FROM plans WHERE name ILIKE $1 LIMIT 1", [plan]);
            }
            
            // Fallback: Se não achou ou não veio, pega o gratuito
            if (!planRes || planRes.rows.length === 0) {
                planRes = await db.query("SELECT id, price, name FROM plans WHERE price = 0 OR name ILIKE '%Gratuito%' LIMIT 1");
            }
            
            // Fallback Extremo: Pega o mais barato
            if (planRes.rows.length === 0) {
                planRes = await db.query("SELECT id, price, name FROM plans ORDER BY price ASC LIMIT 1");
            }

            if (planRes.rows.length > 0) {
                const selectedPlan = planRes.rows[0];
                // Cria a assinatura
                await db.query(
                    "INSERT INTO subscriptions (user_id, plan_id, status, start_date) VALUES ($1, $2, 'active', NOW())",
                    [user.id, selectedPlan.id]
                );
            }
        } else if (userRole === 'trainer') {
            await db.query('INSERT INTO trainers (user_id) VALUES ($1)', [user.id]);
        }

        // 5. Notificações
        try {
            await createNotification(user.id, 'Bem-vindo ao Momentum Fit!', 'Seu cadastro foi realizado com sucesso. Complete seu perfil para começar.', '/client/profile');
            // Enviar e-mail (Assíncrono)
            sendNewUserEmail(user.email, user.name, user.email, userRole).catch(e => console.error("Erro email welcome:", e));
        } catch (notifError) {
            console.error("Erro ao criar notificação inicial:", notifError);
        }

        await db.query('COMMIT');

        // 6. Auto-Login e Redirecionamento de Fluxo
        req.session.user = user;
        
        if (userRole === 'client') {
            req.flash('success', 'Cadastro realizado! Vamos configurar seu perfil.');
            return res.redirect('/client/profile'); // Direciona para Anamnese
        } else {
            req.flash('success', 'Cadastro realizado! Aguarde a aprovação do administrador.');
            return res.redirect('/trainer/dashboard');
        }

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Erro no registro:", err);
        req.flash('error', 'Erro ao registrar: ' + err.message);
        res.redirect('/auth/register');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
