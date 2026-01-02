const { pool } = require('./db');

async function migrate() {
    try {
        console.log('Criando tabela exercise_library...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS exercise_library (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT, -- O que é
                recommendations TEXT, -- Recomendações
                execution_instructions TEXT, -- Forma de fazer
                tips TEXT, -- Dicas
                target_audience TEXT, -- Indicado para
                image_url TEXT, -- URL do Vercel Blob
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        console.log('Atualizando tabela workout_exercises para suportar imagens...');
        await pool.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES exercise_library(id) ON DELETE SET NULL;
        `);

        console.log('Migração concluída.');
    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        process.exit();
    }
}
migrate();
