const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('��� Iniciando verificação e correção do Banco de Dados...');
        await client.query('BEGIN');

        // --- 1. TABELA USERS ---
        console.log('-> Verificando tabela USERS...');
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
        // Adicionar colunas faltantes em users
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id);`);

        // --- 2. TABELA TRAINERS (Onde ocorreu o erro) ---
        console.log('-> Verificando tabela TRAINERS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS trainers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE
            );
        `);
        // Adicionar colunas críticas
        await client.query(`ALTER TABLE trainers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';`);
        await client.query(`ALTER TABLE trainers ADD COLUMN IF NOT EXISTS bio TEXT;`);
        await client.query(`ALTER TABLE trainers ADD COLUMN IF NOT EXISTS specialties TEXT;`);
        await client.query(`ALTER TABLE trainers ADD COLUMN IF NOT EXISTS certifications TEXT;`);
        await client.query(`ALTER TABLE trainers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0;`);

        // --- 3. TABELA CLIENTS ---
        console.log('-> Verificando tabela CLIENTS...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE
            );
        `);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id);`); // Legado ou redundante, mas bom manter se usado
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(50);`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS height NUMERIC(5,2);`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_weight NUMERIC(5,2);`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS fitness_goals TEXT;`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50);`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS injuries TEXT;`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS available_equipment TEXT;`);
        await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_days VARCHAR(255);`);

        // --- 4. TABELAS DE TREINO (WORKOUTS) ---
        console.log('-> Verificando tabelas de TREINO...');
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
        await client.query(`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';`);
        await client.query(`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(50);`);
        await client.query(`ALTER TABLE workouts ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercise_library(id)
            );
        `);
        // Colunas de execução (log)
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS sets INTEGER;`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS reps VARCHAR(50);`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS weight VARCHAR(50);`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS notes TEXT;`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS order_index INTEGER;`);
        // Logs de execução do aluno
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS log_weight VARCHAR(50);`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS log_reps VARCHAR(50);`);
        await client.query(`ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;`);

        // --- 5. TABELA ARTICLES (Blog) ---
        console.log('-> Verificando tabela ARTICLES...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS articles (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT
            );
        `);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id);`);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;`);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS category VARCHAR(100);`);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';`);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;`);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS cover_image TEXT;`);
        await client.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);

        // --- 6. TABELA CHECKINS & NOTIFICAÇÕES ---
        console.log('-> Verificando CHECKINS e NOTIFICAÇÕES...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                workout_id INTEGER REFERENCES workouts(id),
                date DATE DEFAULT CURRENT_DATE,
                feedback_text TEXT,
                effort_level INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                title VARCHAR(255),
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                link VARCHAR(255),
                type VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // --- 7. SESSÃO (Essencial para login) ---
        console.log('-> Verificando tabela SESSION...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid VARCHAR NOT NULL COLLATE "default",
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            ) WITH (OIDS=FALSE);
        `);
        // Adiciona constraint se não existir (ignora erro se já existir)
        try {
            await client.query(`ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;`);
        } catch (e) {
            // Constraint já existe, ignorar
        }

        await client.query('COMMIT');
        console.log('✅ Correção do Banco de Dados concluída com sucesso!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro fatal na migração:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
