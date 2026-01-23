const { pool } = require('../../database/db');

async function migrate() {
    try {
        console.log("⏳ Criando tabela de histórico de anamnese...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS client_profile_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                profile_snapshot JSONB, -- Salva o perfil completo como JSON
                changed_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Tabela client_profile_history criada.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro:", err);
        process.exit(1);
    }
}

migrate();
