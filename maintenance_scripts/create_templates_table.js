const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Criando tabela de templates...');
        await client.query('BEGIN');

        // Tabela de Cabeçalho do Template
        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_templates (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
                category VARCHAR(100), -- 'Hipertrofia', 'Emagrecimento'
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Tabela de Exercícios do Template
        await client.query(`
            CREATE TABLE IF NOT EXISTS template_exercises (
                id SERIAL PRIMARY KEY,
                template_id INTEGER REFERENCES workout_templates(id) ON DELETE CASCADE,
                library_id INTEGER REFERENCES exercise_library(id),
                name VARCHAR(255),
                sets INTEGER,
                reps VARCHAR(50),
                rest_seconds INTEGER,
                notes TEXT,
                order_index INTEGER
            );
        `);

        await client.query('COMMIT');
        console.log('Tabelas de Templates criadas!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
