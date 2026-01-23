require('dotenv').config();
const db = require('../database/db');

async function updateSystem() {
    try {
        console.log('Ì¥Ñ Atualizando Banco de Dados...');

        // 1. Tabela de Mensagens para o Chat
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id),
                receiver_id INTEGER REFERENCES users(id),
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Adicionar colunas detalhadas na tabela clients para Anamnese IA
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS sleep_hours VARCHAR(50),
            ADD COLUMN IF NOT EXISTS stress_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS diet_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS hydration_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS alcohol_consumption VARCHAR(100),
            ADD COLUMN IF NOT EXISTS motivation_source TEXT;
        `);

        console.log('‚úÖ Banco de dados atualizado com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('‚ùå Erro SQL:', err);
        process.exit(1);
    }
}

updateSystem();
