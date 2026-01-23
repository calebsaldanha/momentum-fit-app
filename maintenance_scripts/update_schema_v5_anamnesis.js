require('dotenv').config();
const db = require('../database/db');

async function migrate() {
    console.log("��� Expandindo Anamnese para V5 (Completa)...");
    try {
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS alcohol_consumption VARCHAR(50), -- Nunca, Social, Frequente
            ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50),      -- Não fumante, Fumante, Ex-fumante
            ADD COLUMN IF NOT EXISTS training_experience VARCHAR(50), -- Iniciante, Intermediário, Avançado
            ADD COLUMN IF NOT EXISTS preferred_training_time VARCHAR(50), -- Manhã, Tarde, Noite
            ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100),
            ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
        `);
        console.log("✅ Schema V5 aplicado com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

migrate();
