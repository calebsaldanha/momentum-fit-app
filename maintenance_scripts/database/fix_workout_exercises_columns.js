const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log('��� Iniciando correção da tabela workout_exercises...');

        // Adiciona coluna 'weight' se não existir
        await pool.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS weight VARCHAR(50);
        `);
        console.log('✅ Coluna weight verificada/adicionada.');

        // Adiciona coluna 'library_id' se não existir (caso o script anterior tenha falhado)
        await pool.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES exercise_library(id) ON DELETE SET NULL;
        `);
        console.log('✅ Coluna library_id verificada/adicionada.');

        // Garante que a coluna 'name' aceite nulos caso usemos apenas library_id no futuro (opcional, mas seguro)
        // await pool.query("ALTER TABLE workout_exercises ALTER COLUMN name DROP NOT NULL");

        console.log('��� Migração concluída com sucesso.');
    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        process.exit();
    }
}
migrate();
