const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("Ìª†Ô∏è Corrigindo colunas faltantes em client_profiles...");

        // 1. Adicionar training_days (corrigindo discrep√¢ncia com 'frequency')
        await pool.query("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS training_days VARCHAR(50);");
        
        // 2. Adicionar equipment
        await pool.query("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS equipment TEXT;");

        // 3. Adicionar fitness_level
        await pool.query("ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(50);");

        console.log("‚úÖ Colunas 'training_days', 'equipment' e 'fitness_level' adicionadas com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro ao adicionar colunas:", err);
        process.exit(1);
    }
}

migrate();
