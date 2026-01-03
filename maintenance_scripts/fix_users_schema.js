const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixUsersSchema() {
    console.log("Ìª†Ô∏è Iniciando reparo da tabela 'users'...");

    try {
        // Adicionar profile_image (Texto/URL da imagem)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS profile_image TEXT;
        `);
        console.log("‚úÖ Coluna 'profile_image' adicionada/verificada.");

        // Adicionar status (Ativo/Inativo) - usado em algumas listagens
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        `);
        console.log("‚úÖ Coluna 'status' adicionada/verificada.");

        // Adicionar goal (Objetivo) se n√£o existir
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS goal TEXT;
        `);
        console.log("‚úÖ Coluna 'goal' adicionada/verificada.");

        console.log("Ì∫Ä Tabela de usu√°rios corrigida com sucesso!");
    } catch (err) {
        console.error("‚ùå Erro ao atualizar schema de users:", err);
    } finally {
        pool.end();
    }
}

fixUsersSchema();
