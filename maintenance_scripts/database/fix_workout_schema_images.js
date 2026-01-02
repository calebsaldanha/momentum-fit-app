require('dotenv').config();
const { pool } = require('../../database/db');

async function fixSchema() {
    console.log("⏳ Verificando schema da tabela 'workout_exercises'...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Adiciona a coluna image_url se ela não existir
        await client.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);
        
        console.log("✅ Coluna 'image_url' verificada/adicionada com sucesso.");
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
