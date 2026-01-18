require('dotenv').config();
const db = require('../database/db');

async function fixSchema() {
    console.log("Iniciando correção do Schema 'trainers'...");
    try {
        // Adiciona colunas que podem estar faltando na tabela trainers
        await db.query(`
            ALTER TABLE trainers 
            ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS specialties TEXT,
            ADD COLUMN IF NOT EXISTS bio TEXT,
            ADD COLUMN IF NOT EXISTS certificates TEXT,
            ADD COLUMN IF NOT EXISTS pix_key TEXT,
            ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10,2) DEFAULT 0.00;
        `);
        console.log("Sucesso: Colunas adicionadas (se não existiam).");
        
        // Garante que a tabela payments exista para a página financeira
        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                trainer_id INTEGER REFERENCES trainers(id),
                amount NUMERIC(10,2),
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Sucesso: Tabela payments verificada.");

        process.exit(0);
    } catch (err) {
        console.error("Erro ao corrigir schema:", err);
        process.exit(1);
    }
}

fixSchema();
