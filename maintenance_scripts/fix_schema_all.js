const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("❌ Erro: Nenhuma string de conexão definida.");
    process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    console.log("���️ Iniciando atualização do esquema do banco...");
    try {
        // 1. Adicionar trainer_id em USERS
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_id INTEGER;");
        console.log("✅ Coluna 'trainer_id' verificada na tabela 'users'.");

        // 2. Adicionar trainer_id em WORKOUTS
        await pool.query("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS trainer_id INTEGER;");
        console.log("✅ Coluna 'trainer_id' verificada na tabela 'workouts'.");

        // 3. Adicionar user_id em WORKOUTS (Crítico para client-details)
        await pool.query("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS user_id INTEGER;");
        console.log("✅ Coluna 'user_id' verificada na tabela 'workouts'.");

        console.log("��� Banco de dados atualizado com sucesso!");
    } catch (err) {
        console.error("❌ Erro na migração:", err);
    } finally {
        pool.end();
    }
}

runMigration();
