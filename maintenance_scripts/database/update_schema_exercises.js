const { pool } = require('./db');

async function migrate() {
    try {
        console.log('Ì¥Ñ Criando tabela exercise_library...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS exercise_library (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                recommendations TEXT,
                execution_instructions TEXT,
                tips TEXT,
                target_audience TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        console.log('Ì¥Ñ Atualizando tabela workout_exercises...');
        await pool.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES exercise_library(id) ON DELETE SET NULL;
        `);

        console.log('‚úÖ Migra√ß√£o conclu√≠da com sucesso.');
    } catch (err) {
        console.error('‚ùå Erro na migra√ß√£o:', err);
    } finally {
        process.exit();
    }
}
migrate();
