const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("��� Adicionando colunas de recuperação de senha...");
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires BIGINT`);
        console.log("✅ Colunas adicionadas com sucesso.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}
migrate();
