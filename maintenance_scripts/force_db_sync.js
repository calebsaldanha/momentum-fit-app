const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function forceSync() {
    const client = await pool.connect();
    try {
        console.log('��� INICIANDO SINCRONIZAÇÃO FORÇADA DE SCHEMA...');
        await client.query('BEGIN');

        // --- 1. USERS ---
        console.log('-> Verificando USERS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'client',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        // Adicionar colunas individualmente para garantir
        const userCols = [
            "ADD COLUMN IF NOT EXISTS profile_image TEXT",
            "ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
            "ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)",
            "ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP"
        ];
        for (let cmd of userCols) await client.query(`ALTER TABLE users ${cmd}`);

        // --- 2. TRAINERS (O erro estava aqui) ---
        console.log('-> Verificando TRAINERS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS trainers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE
            );
        `);
        const trainerCols = [
            "ADD COLUMN IF NOT EXISTS bio TEXT",
            "ADD COLUMN IF NOT EXISTS specialties TEXT",
            "ADD COLUMN IF NOT EXISTS certifications TEXT",
            "ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending'", 
            "ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0"
        ];
        for (let cmd of trainerCols) await client.query(`ALTER TABLE trainers ${cmd}`);

        // --- 3. CLIENTS ---
        console.log('-> Verificando CLIENTS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE
            );
        `);
        const clientCols = [
            "ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id)",
            "ADD COLUMN IF NOT EXISTS birth_date DATE",
            "ADD COLUMN IF NOT EXISTS gender VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS height NUMERIC(5,2)",
            "ADD COLUMN IF NOT EXISTS current_weight NUMERIC(5,2)",
            "ADD COLUMN IF NOT EXISTS fitness_goals TEXT",
            "ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS injuries TEXT",
            "ADD COLUMN IF NOT EXISTS available_equipment TEXT",
            "ADD COLUMN IF NOT EXISTS training_days VARCHAR(255)"
        ];
        for (let cmd of clientCols) await client.query(`ALTER TABLE clients ${cmd}`);

        // --- 4. EXERCISE LIBRARY ---
        console.log('-> Verificando EXERCISE LIBRARY...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS exercise_library (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                muscle_group VARCHAR(100),
                equipment VARCHAR(100),
                video_url TEXT,
                image_url TEXT,
                instructions TEXT,
                is_platform_default BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id)
            );
        `);

        // --- 5. WORKOUTS ---
        console.log('-> Verificando WORKOUTS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES clients(id),
                trainer_id INTEGER REFERENCES users(id),
                title VARCHAR(255),
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        const workoutCols = [
            "ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
            "ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP"
        ];
        for (let cmd of workoutCols) await client.query(`ALTER TABLE workouts ${cmd}`);

        // --- 6. WORKOUT EXERCISES ---
        console.log('-> Verificando WORKOUT EXERCISES...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercise_library(id)
            );
        `);
        const weCols = [
            "ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255)",
            "ADD COLUMN IF NOT EXISTS sets INTEGER",
            "ADD COLUMN IF NOT EXISTS reps VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS weight VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS notes TEXT",
            "ADD COLUMN IF NOT EXISTS order_index INTEGER",
            "ADD COLUMN IF NOT EXISTS log_weight VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS log_reps VARCHAR(50)",
            "ADD COLUMN IF NOT EXISTS log_rpe INTEGER",
            "ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE"
        ];
        for (let cmd of weCols) await client.query(`ALTER TABLE workout_exercises ${cmd}`);

        // --- 7. ARTICLES & OTHERS ---
        console.log('-> Verificando ARTICLES & CHECKINS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY);
        `);
        const artCols = [
            "ADD COLUMN IF NOT EXISTS title VARCHAR(255)",
            "ADD COLUMN IF NOT EXISTS content TEXT",
            "ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id)",
            "ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE",
            "ADD COLUMN IF NOT EXISTS category VARCHAR(100)",
            "ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published'",
            "ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS cover_image TEXT",
            "ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()"
        ];
        for (let cmd of artCols) await client.query(`ALTER TABLE articles ${cmd}`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                workout_id INTEGER REFERENCES workouts(id),
                date TIMESTAMP DEFAULT NOW(),
                feedback_text TEXT,
                effort_level INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // --- 8. TEMPLATES ---
        console.log('-> Verificando TEMPLATES...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_templates (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                difficulty_level VARCHAR(50),
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS template_exercises (
                id SERIAL PRIMARY KEY,
                template_id INTEGER REFERENCES workout_templates(id) ON DELETE CASCADE,
                library_id INTEGER REFERENCES exercise_library(id),
                name VARCHAR(255),
                sets INTEGER,
                reps VARCHAR(50),
                notes TEXT,
                order_index INTEGER
            );
        `);

        await client.query('COMMIT');
        console.log('✅ SCHEMA CORRIGIDO COM SUCESSO! A coluna approval_status deve existir agora.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ ERRO CRÍTICO NA ATUALIZAÇÃO:', err);
    } finally {
        client.release();
        pool.end();
    }
}

forceSync();
