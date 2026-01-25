require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("���️ Criando tabelas de relacionamento (Trainer <-> Client)...");
        await client.query('BEGIN');

        // 1. Tabela de Atribuição (Assignments)
        // Define quem treina quem.
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'active', -- active, archived, pending
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(trainer_id, client_id) -- Impede duplicidade
            );
        `);

        // 2. Índices para performance (Buscas frequentes)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_assignments_trainer ON assignments(trainer_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_assignments_client ON assignments(client_id);`);

        // 3. View Materializada ou Query Helper (Conceitual - faremos via JOIN no controller)
        // Mas vamos garantir que a tabela users tenha os campos certos para listagem
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS objective VARCHAR(100);
        `);

        await client.query('COMMIT');
        console.log("✅ Estrutura de Fase 3 aplicada com sucesso.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Erro na migração:", e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
