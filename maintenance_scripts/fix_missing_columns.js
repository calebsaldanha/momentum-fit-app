const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
    console.log("Ìª†Ô∏è Iniciando reparo do banco de dados...");

    try {
        // 1. Adicionar trainer_id na tabela users (se n√£o existir)
        console.log("Verificando tabela 'users'...");
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS trainer_id INTEGER;
        `);
        console.log("‚úÖ Coluna 'trainer_id' garantida na tabela 'users'.");

        // 2. Adicionar trainer_id na tabela workouts (se n√£o existir, para contagem de stats)
        console.log("Verificando tabela 'workouts'...");
        await pool.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS trainer_id INTEGER;
        `);
        console.log("‚úÖ Coluna 'trainer_id' garantida na tabela 'workouts'.");

        console.log("Ì∫Ä Reparo conclu√≠do! O erro 'column does not exist' deve desaparecer.");
    } catch (err) {
        console.error("‚ùå Erro ao reparar banco de dados:", err);
    } finally {
        pool.end();
    }
}

fixSchema();
