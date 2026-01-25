require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixDatabase() {
    const client = await pool.connect();
    try {
        console.log("Ìª†Ô∏è Verificando integridade do schema...");
        await client.query('BEGIN');

        // 1. Criar tabela ASSIGNMENTS (O Erro Cr√≠tico)
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(trainer_id, client_id)
            );
        `);
        console.log("‚úÖ Tabela 'assignments' verificada/criada.");

        // 2. Criar tabela WORKOUTS (Necess√°ria para dashboard)
        await client.query(`
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                level VARCHAR(20),
                frequency INTEGER DEFAULT 0,
                is_template BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("‚úÖ Tabela 'workouts' verificada/criada.");

        // 3. Atualizar USERS (Colunas necess√°rias para listagem)
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS objective VARCHAR(100),
            ADD COLUMN IF NOT EXISTS last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log("‚úÖ Colunas de 'users' verificadas.");

        await client.query('COMMIT');
        console.log("Ì∫Ä Banco de dados reparado com sucesso!");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("‚ùå Falha no reparo:", e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixDatabase();
