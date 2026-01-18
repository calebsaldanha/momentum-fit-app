require('dotenv').config();
const db = require('../database/db');

async function migrate() {
    console.log("��� Iniciando migração V4 (Agenda e IA)...");
    
    try {
        // 1. Tabela de Agenda do Treinador
        await db.query(`
            CREATE TABLE IF NOT EXISTS trainer_schedule (
                id SERIAL PRIMARY KEY,
                trainer_id INTEGER REFERENCES users(id),
                title VARCHAR(100) NOT NULL,
                day_of_week VARCHAR(20), -- 'Segunda', 'Terça'...
                start_time TIME NOT NULL,
                end_time TIME,
                client_name VARCHAR(100), -- Opcional, se for aula particular
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Tabela de Logs de IA (Auditoria)
        await db.query(`
            CREATE TABLE IF NOT EXISTS ia_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                prompt TEXT,
                response TEXT,
                tokens_used INTEGER DEFAULT 0,
                model VARCHAR(50) DEFAULT 'gemini-pro',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Tabelas de Agenda e IA criadas.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

migrate();
