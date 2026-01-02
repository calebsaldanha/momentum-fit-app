require('dotenv').config();
const { pool } = require('../../database/db');

async function fixSchema() {
    console.log("⏳ Verificando schema da tabela 'exercise_library'...");
    try {
        // 1. Adiciona coluna 'category' se não existir
        await pool.query(`
            ALTER TABLE exercise_library 
            ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Geral';
        `);
        console.log("✅ Coluna 'category' verificada/adicionada.");

        // 2. Adiciona outras colunas que o script usa, por garantia
        await pool.query(`
            ALTER TABLE exercise_library 
            ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100),
            ADD COLUMN IF NOT EXISTS execution_instructions TEXT;
        `);
        console.log("✅ Colunas 'target_audience' e 'execution_instructions' verificadas.");

    } catch (err) {
        console.error("❌ Erro ao atualizar schema:", err);
    } finally {
        await pool.end();
    }
}

fixSchema();
