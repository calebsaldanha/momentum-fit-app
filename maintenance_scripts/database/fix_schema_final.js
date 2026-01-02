require('dotenv').config();
const { pool } = require('../../database/db');

async function fixSchema() {
    console.log("⏳ Verificando schema completo...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Garante colunas na tabela de exercícios do treino (workout_exercises)
        await client.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS video_url TEXT;
        `);
        console.log("✅ Tabela 'workout_exercises' verificada.");

        // 2. Garante colunas na biblioteca (exercise_library)
        await client.query(`
            ALTER TABLE exercise_library 
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS execution_instructions TEXT,
            ADD COLUMN IF NOT EXISTS tips TEXT,
            ADD COLUMN IF NOT EXISTS recommendations TEXT,
            ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100),
            ADD COLUMN IF NOT EXISTS category VARCHAR(100);
        `);
        console.log("✅ Tabela 'exercise_library' verificada.");

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Erro ao atualizar schema:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSchema();
