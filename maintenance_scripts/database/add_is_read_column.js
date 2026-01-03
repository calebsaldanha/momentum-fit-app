const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("Ìª†Ô∏è Adicionando coluna 'is_read' na tabela messages...");

        await pool.query(`
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
        `);

        console.log("‚úÖ Coluna 'is_read' adicionada com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro na migra√ß√£o:", err);
        process.exit(1);
    }
}

migrate();
