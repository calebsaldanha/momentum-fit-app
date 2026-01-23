const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixRegistrationColumns() {
    console.log("Ì¥ß Corrigindo colunas faltantes na tabela 'users'...");

    try {
        // Adiciona fitness_level (N√≠vel de condicionamento)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS fitness_level TEXT;
        `);
        console.log("‚úÖ Coluna 'fitness_level' verificada.");

        // Adiciona height (Altura)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS height NUMERIC;
        `);
        console.log("‚úÖ Coluna 'height' verificada.");

        // Adiciona weight (Peso)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS weight NUMERIC;
        `);
        console.log("‚úÖ Coluna 'weight' verificada.");

    } catch (err) {
        console.error("‚ùå Erro ao adicionar colunas:", err);
    } finally {
        pool.end();
    }
}

fixRegistrationColumns();
