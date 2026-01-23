const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixWorkoutsSchema() {
    console.log("���️ Iniciando reparo da tabela 'workouts'...");

    try {
        // Adicionar user_id se não existir
        await pool.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
        `);
        console.log("✅ Coluna 'user_id' adicionada com sucesso.");

        // Garantir que trainer_id também exista (reforço)
        await pool.query(`
            ALTER TABLE workouts 
            ADD COLUMN IF NOT EXISTS trainer_id INTEGER;
        `);
        console.log("✅ Verificação de 'trainer_id' concluída.");

    } catch (err) {
        console.error("❌ Erro ao atualizar schema:", err);
    } finally {
        pool.end();
    }
}

fixWorkoutsSchema();
