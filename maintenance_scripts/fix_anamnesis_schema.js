require('dotenv').config();
const db = require('../database/db');

async function fixSchema() {
    console.log("��� Expandindo Anamnese e Corrigindo Library...");
    try {
        // 1. Corrigir erro da coluna 'muscle_group' na biblioteca de exercicios
        await db.query(`
            ALTER TABLE exercise_library 
            ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(100);
        `);

        // 2. Expandir Tabela CLIENTS (Ficha Completa)
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS sleep_quality VARCHAR(50),      -- Boa, Regular, Ruim...
            ADD COLUMN IF NOT EXISTS stress_level VARCHAR(50),       -- Alto, Médio, Baixo
            ADD COLUMN IF NOT EXISTS water_intake VARCHAR(50),       -- <1L, 2L, >3L
            ADD COLUMN IF NOT EXISTS nutrition_type VARCHAR(100),    -- Onívoro, Vegano, LowCarb...
            ADD COLUMN IF NOT EXISTS training_days_goal INTEGER;     -- Quantos dias quer treinar
        `);

        console.log("✅ Schema atualizado com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

fixSchema();
