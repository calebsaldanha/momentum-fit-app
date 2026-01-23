const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("��� Iniciando migração da tabela articles...");

        // 1. Adiciona a coluna status se não existir
        await pool.query(`
            ALTER TABLE articles 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
        `);
        
        // 2. Garante que artigos existentes fiquem como 'published'
        await pool.query(`
            UPDATE articles SET status = 'published' WHERE status IS NULL;
        `);

        console.log("✅ Coluna 'status' adicionada e registros atualizados.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

migrate();
