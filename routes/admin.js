const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const pool = require('../database/db');

const isAdmin = [ensureAuthenticated, ensureRole('admin')];

// Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    let stats = { users: 0, trainers: 0, revenue: 0 };
    try {
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM users WHERE role = 'trainer') as trainers,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid') as revenue
        `);
        stats = result.rows[0];
    } catch (e) {
        console.warn("âš ï¸ Erro ao carregar stats (DB incompleto?)", e.message);
    }
    
    res.render('pages/admin-dashboard', { user: req.user, stats, path: '/admin/dashboard' });
});

// íº‘ ROTA DE AUTO-CURA (SELF-HEALING V2)
router.post('/repair-db', isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("í» ï¸ Admin iniciou reparo de banco...");

        // 1. Core Tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100), email VARCHAR(100) UNIQUE, password VARCHAR(255),
                role VARCHAR(20) DEFAULT 'client',
                photo_url TEXT, phone VARCHAR(20), objective VARCHAR(100),
                current_plan_id INTEGER, plan_expires_at TIMESTAMP,
                reset_token VARCHAR(255), reset_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_login TIMESTAMP
            );
        `);

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

        // 2. Workout System
        await client.query(`
            CREATE TABLE IF NOT EXISTS exercises (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                muscle_group VARCHAR(50), equipment VARCHAR(50),
                video_url TEXT, instructions TEXT, is_custom BOOLEAN DEFAULT false,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL, description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // A TABELA QUE FALTOU NO ÃšLTIMO COMMIT
        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercises(id),
                sets INTEGER, reps VARCHAR(20), load VARCHAR(20), rest_seconds INTEGER,
                notes TEXT, "order" INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
        `);

        // 3. Financeiro
        await client.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY, name VARCHAR(50), slug VARCHAR(50) UNIQUE,
                price DECIMAL(10,2), stripe_price_id VARCHAR(100), features JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id), plan_id INTEGER REFERENCES plans(id),
                amount DECIMAL(10,2), method VARCHAR(50), status VARCHAR(50),
                stripe_checkout_session_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // 4. NotificaÃ§Ãµes e CMS
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
                type VARCHAR(50), title VARCHAR(100), message TEXT, is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS site_content (
                key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, section VARCHAR(50),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        req.flash('success', 'Banco de dados reparado (Tabelas de Treino criadas)!');
        res.redirect('/admin/dashboard');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        req.flash('error', 'Erro no reparo: ' + err.message);
        res.redirect('/admin/dashboard');
    } finally {
        client.release();
    }
});

// Rotas Placeholder
router.get('/users', isAdmin, (req, res) => res.render('pages/admin-users', { user: req.user, path: '/admin/users' }));
router.get('/finance', isAdmin, (req, res) => res.render('pages/admin-finance', { user: req.user, path: '/admin/finance' }));
router.get('/content', isAdmin, (req, res) => res.render('pages/admin-content', { user: req.user, path: '/admin/content' }));

module.exports = router;
