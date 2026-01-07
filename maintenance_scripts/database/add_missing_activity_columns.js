const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("Ìª†Ô∏è Verificando colunas de atividade...");
        await pool.query("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS past_activity TEXT;");
        await pool.query("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS liked_activities TEXT;");
        await pool.query("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS disliked_activities TEXT;");
        console.log("‚úÖ Colunas de atividade verificadas.");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro:", err);
        process.exit(1);
    }
}
migrate();
