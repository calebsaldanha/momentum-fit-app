const { pool } = require('./db');

async function migrate() {
    try {
        console.log('Verificando tabela workout_exercises...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                sets VARCHAR(50),
                reps VARCHAR(50),
                notes TEXT,
                video_url TEXT,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Tabela garantida.');
    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        process.exit();
    }
}
migrate();
