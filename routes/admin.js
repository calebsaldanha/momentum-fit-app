const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

// Middleware de segurança
const isAdmin = [ensureAuthenticated, ensureRole('admin')];

// Dashboard Admin
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        // Tenta buscar stats. Se falhar (tabela não existe), retorna 0.
        let stats = { users: 0, trainers: 0, revenue: 0 };
        try {
            const result = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users,
                    (SELECT COUNT(*) FROM users WHERE role = 'trainer') as trainers
            `);
            stats = result.rows[0] || stats;
        } catch (e) {
            console.warn("⚠️ Tabelas ainda não criadas. Necessário reparo.");
        }

        res.render('pages/admin-dashboard', {
            user: req.user,
            stats,
            path: '/admin/dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/error', { message: 'Erro interno', error: err });
    }
});

// ��� ROTA DE EMERGÊNCIA: REPARAR BANCO DE DADOS
router.post('/repair-db', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log("���️ Iniciando Auto-Reparo do Admin...");

        // 1. Tabela Assignments (Causa do Erro do Trainer)
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(trainer_id, client_id)
            );
        `);

        // 2. Tabela Workouts e Coluna is_active (Causa do Erro do Client)
        await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                level VARCHAR(20),
                frequency INTEGER DEFAULT 0,
                is_template BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true, -- A coluna crítica
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Patch para adicionar is_active se a tabela já existia sem ela
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_active') THEN 
                    ALTER TABLE workouts ADD COLUMN is_active BOOLEAN DEFAULT true; 
                END IF;
            END 
            $$;
        `);

        // 3. Tabela de Pagamentos com Stripe
        await client.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_id INTEGER REFERENCES plans(id),
                amount DECIMAL(10,2),
                method VARCHAR(50),
                status VARCHAR(50),
                stripe_checkout_session_id VARCHAR(255) UNIQUE,
                stripe_payment_intent_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Inserção de Planos Padrão (Se não existirem)
        await client.query(`
            INSERT INTO plans (name, slug, price, features, stripe_price_id)
            VALUES 
                ('Start', 'start', 0.00, '["App", "IA Basic"]', 'price_1StT8zRrwP9b7RMz32gK7SOf'),
                ('Momentum Pro', 'pro', 89.90, '["IA Pro", "Videos"]', 'price_1StT20RrwP9b7RMzWOohogE6'),
                ('VIP Personal', 'vip', 249.90, '["Personal Humano"]', 'price_1StTA5RrwP9b7RMziXrKtPRe')
            ON CONFLICT (slug) DO NOTHING;
        `);

        await client.query('COMMIT');
        
        req.flash('success', 'Banco de dados reparado e sincronizado com sucesso!');
        res.redirect('/admin/dashboard');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro no reparo:", err);
        req.flash('error', 'Falha crítica no reparo: ' + err.message);
        res.redirect('/admin/dashboard');
    } finally {
        client.release();
    }
});

// Rotas padrão do Admin
router.get('/users', isAdmin, (req, res) => res.render('pages/admin-users', { user: req.user, path: '/admin/users' }));
router.get('/finance', isAdmin, (req, res) => res.render('pages/admin-finance', { user: req.user, path: '/admin/finance' }));
router.get('/content', isAdmin, (req, res) => res.render('pages/admin-content', { user: req.user, path: '/admin/content' }));

module.exports = router;
