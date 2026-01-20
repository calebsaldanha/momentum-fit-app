const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// GET Login
router.get('/login', (req, res) => {
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
                
                // Redirecionamento
                if (user.role === 'admin' || user.role === 'superadmin') return res.redirect('/admin/dashboard');
                if (user.role === 'trainer') return res.redirect('/trainer/dashboard');
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
    // CORREÇÃO: Passar 'plan' para a view para evitar ReferenceError se ela usar essa variável
    const plan = req.query.plan || '';
    res.render('pages/register', { plan: plan });
});

// POST Register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    
    try {
        await db.query('BEGIN');

        // 1. Verificar duplicação
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            await db.query('ROLLBACK');
            req.flash('error', 'E-mail já cadastrado.');
            return res.redirect('/auth/register');
        }

        // 2. Criar Usuário
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role === 'trainer' ? 'trainer' : 'client';
        const userStatus = userRole === 'trainer' ? 'pending_approval' : 'active';
        
        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, role',
            [name, email, hashedPassword, userRole, userStatus]
        );
        const userId = newUser.rows[0].id;

        // 3. Configurar Perfil
        if (userRole === 'client') {
            await db.query('INSERT INTO clients (user_id) VALUES ($1)', [userId]);
            
            // CORREÇÃO CRÍTICA: Buscar ID do plano correto para inserir na tabela subscriptions
            // A tabela aceita plan_id (int), não plan_name (string)
            let planRes = await db.query("SELECT id FROM plans WHERE price = 0 OR name ILIKE '%Gratuito%' LIMIT 1");
            
            if (planRes.rows.length === 0) {
                // Fallback para o plano mais barato se não houver gratuito
                planRes = await db.query("SELECT id FROM plans ORDER BY price ASC LIMIT 1");
            }

            if (planRes.rows.length > 0) {
                const planId = planRes.rows[0].id;
                // Inserção corrigida usando plan_id
                await db.query(
                    "INSERT INTO subscriptions (user_id, plan_id, status, start_date) VALUES ($1, $2, 'active', NOW())",
                    [userId, planId]
                );
            } else {
                // Se nenhum plano existir no banco, cria um default
                const newPlan = await db.query("INSERT INTO plans (name, price, description) VALUES ('Básico', 0, 'Plano Inicial') RETURNING id");
                await db.query(
                    "INSERT INTO subscriptions (user_id, plan_id, status, start_date) VALUES ($1, $2, 'active', NOW())",
                    [userId, newPlan.rows[0].id]
                );
            }

        } else if (userRole === 'trainer') {
            await db.query('INSERT INTO trainers (user_id) VALUES ($1)', [userId]);
        }

        await db.query('COMMIT');
        
        req.flash('success', 'Cadastro realizado! Faça login.');
        res.redirect('/auth/login');

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
