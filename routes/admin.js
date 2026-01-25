const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

const isAdmin = [ensureAuthenticated, ensureRole('admin')];

// Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    let stats = { users: 0, trainers: 0, revenue: 0.0 };
    
    try {
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM users WHERE role = 'trainer') as trainers,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid') as revenue
        `);
        
        if (result.rows[0]) {
            stats = {
                users: parseInt(result.rows[0].users || 0),
                trainers: parseInt(result.rows[0].trainers || 0),
                revenue: parseFloat(result.rows[0].revenue || 0)
            };
        }
    } catch (e) {
        console.warn("⚠️ Erro stats:", e.message);
    }
    
    res.render('pages/admin-dashboard', { user: req.user, stats, path: '/admin/dashboard' });
});

// ��� ROTA DE AUTO-CURA V3 (Schema Migration)
router.post('/repair-db', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("���️ Admin: Iniciando Migração de Schema...");

        // 1. Tabela PLANS (O foco do erro)
        // Se a tabela existe, garantimos que as colunas também existam
        await client.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL
            );
        `);

        // Migração de Colunas para PLANS
        await client.query(`
            DO $$ 
            BEGIN 
                -- Adicionar SLUG
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='slug') THEN 
                    ALTER TABLE plans ADD COLUMN slug VARCHAR(50);
                    ALTER TABLE plans ADD CONSTRAINT plans_slug_key UNIQUE (slug);
                END IF;

                -- Adicionar PRICE
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='price') THEN 
                    ALTER TABLE plans ADD COLUMN price DECIMAL(10,2) DEFAULT 0; 
                END IF;

                -- Adicionar STRIPE_ID
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='stripe_price_id') THEN 
                    ALTER TABLE plans ADD COLUMN stripe_price_id VARCHAR(100); 
                END IF;

                -- Adicionar FEATURES
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='features') THEN 
                    ALTER TABLE plans ADD COLUMN features JSONB DEFAULT '[]'; 
                END IF;

                -- Adicionar IS_ACTIVE
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='is_active') THEN 
                    ALTER TABLE plans ADD COLUMN is_active BOOLEAN DEFAULT true; 
                END IF;
            END 
            $$;
        `);

        // 2. Tabela ASSIGNMENTS (Vínculo)
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

        // 3. Tabela WORKOUTS (Com validação de coluna)
        await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Migração Workouts
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_active') THEN 
                    ALTER TABLE workouts ADD COLUMN is_active BOOLEAN DEFAULT true; 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_template') THEN 
                    ALTER TABLE workouts ADD COLUMN is_template BOOLEAN DEFAULT false; 
                END IF;
            END $$;
        `);

        // 4. Tabela WORKOUT_EXERCISES (Detalhes)
        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercises(id),
                sets INTEGER, reps VARCHAR(20), load VARCHAR(20), rest_seconds INTEGER,
                notes TEXT, "order" INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id)');

        // 5. Inserir/Atualizar Planos
        // Agora seguro pois as colunas existem
        await client.query(`
            INSERT INTO plans (name, slug, price, features, stripe_price_id, is_active)
            VALUES 
                ('Start', 'start', 0.00, '["App", "IA Basic"]', 'price_1StT8zRrwP9b7RMz32gK7SOf', true),
                ('Momentum Pro', 'pro', 89.90, '["IA Pro", "Videos"]', 'price_1StT20RrwP9b7RMzWOohogE6', true),
                ('VIP Personal', 'vip', 249.90, '["Personal Humano"]', 'price_1StTA5RrwP9b7RMziXrKtPRe', true)
            ON CONFLICT (slug) DO UPDATE 
            SET stripe_price_id = EXCLUDED.stripe_price_id,
                price = EXCLUDED.price,
                features = EXCLUDED.features;
        `);

        await client.query('COMMIT');
        console.log("✅ Migração concluída com sucesso.");
        req.flash('success', 'Banco de dados migrado e corrigido!');
        res.redirect('/admin/dashboard');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro na migração: ' + err.message);
        res.redirect('/admin/dashboard');
    } finally {
        client.release();
    }
});

router.get('/users', isAdmin, (req, res) => res.render('pages/admin-users', { user: req.user, path: '/admin/users' }));
router.get('/finance', isAdmin, (req, res) => res.render('pages/admin-finance', { user: req.user, path: '/admin/finance' }));
router.get('/content', isAdmin, (req, res) => res.render('pages/admin-content', { user: req.user, path: '/admin/content' }));

module.exports = router;
