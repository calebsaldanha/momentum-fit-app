const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Iniciando migração de execução de treinos...');
        
        await client.query('BEGIN');

        // 1. Adicionar colunas de log na tabela de exercícios do treino
        // log_weight: Carga real usada
        // log_reps: Repetições reais feitas
        // log_rpe: Percepção de esforço (0-10) por exercício
        // is_completed: Checkbox visual
        await client.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS log_weight VARCHAR(50),
            ADD COLUMN IF NOT EXISTS log_reps VARCHAR(50),
            ADD COLUMN IF NOT EXISTS log_rpe INTEGER,
            ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
        `);

        // 2. Garantir coluna de status e data de fim no treino
        await client.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;
        `);

        await client.query('COMMIT');
        console.log('Migração concluída com sucesso!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na migração:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
