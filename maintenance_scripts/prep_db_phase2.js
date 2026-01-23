require('dotenv').config();
const db = require('../database/db');

async function updateDbPhase2() {
    try {
        console.log('Ì¥Ñ Criando tabela de mensagens...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('‚úÖ Tabela messages pronta.');
        process.exit(0);
    } catch (err) {
        console.error('‚ùå Erro SQL:', err);
        process.exit(1);
    }
}

updateDbPhase2();
