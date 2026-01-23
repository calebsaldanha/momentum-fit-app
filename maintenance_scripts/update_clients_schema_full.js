const { pool } = require('../database/db');

async function run() {
    try {
        console.log("Adicionando colunas completas ao perfil do cliente...");
        await pool.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
            ADD COLUMN IF NOT EXISTS birth_date DATE,
            ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS training_days VARCHAR(255),
            ADD COLUMN IF NOT EXISTS available_equipment TEXT,
            ADD COLUMN IF NOT EXISTS medical_conditions TEXT;
        `);
        console.log("✅ Schema atualizado com sucesso!");
    } catch (e) {
        console.error("❌ Erro ao atualizar schema:", e);
    } finally {
        process.exit();
    }
}
run();
