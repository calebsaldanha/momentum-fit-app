require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
    try {
        console.log("���️  Atualizando tabela workout_exercises...");

        // Adiciona a coluna library_id (Chave estrangeira para a biblioteca)
        await pool.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES exercise_library(id) ON DELETE SET NULL;
        `);
        console.log("✅ Coluna 'library_id' verificada.");

        // Adiciona a coluna image_url (Para salvar a foto específica do exercício no treino)
        await pool.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);
        console.log("✅ Coluna 'image_url' verificada.");

    } catch (err) {
        console.error("❌ Erro na migração:", err.message);
    } finally {
        process.exit();
    }
}

migrate();
