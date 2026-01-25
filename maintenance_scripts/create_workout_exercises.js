require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Ì∑ÑÔ∏è Criando tabela de detalhes do treino...");
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercises(id),
                sets INTEGER,
                reps VARCHAR(20), -- Pode ser "10-12" ou "Falha"
                load VARCHAR(20), -- Carga sugerida
                rest_seconds INTEGER,
                notes TEXT,
                "order" INTEGER DEFAULT 0, -- Ordem no treino
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await client.query('CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);');

        await client.query('COMMIT');
        console.log("‚úÖ Tabela 'workout_exercises' criada.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("‚ùå Erro:", e);
    } finally {
        client.release();
        process.exit(0);
    }
}
migrate();
