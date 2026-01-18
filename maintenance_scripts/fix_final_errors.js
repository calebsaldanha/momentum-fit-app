require('dotenv').config();
const db = require('../database/db');

async function fixDatabase() {
    console.log("��� Iniciando reparo final do Banco de Dados (Versão Corrigida)...");
    
    try {
        // 1. Corrigir Tabela USERS (Erro: column "active" does not exist)
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;`);
        
        // 2. Corrigir Tabela CLIENTS (Erro: column c.weight does not exist)
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2),
            ADD COLUMN IF NOT EXISTS height INTEGER,
            ADD COLUMN IF NOT EXISTS goal VARCHAR(100),
            ADD COLUMN IF NOT EXISTS medical_history TEXT,
            ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS limitations TEXT;
        `);

        // 3. Corrigir Tabela WORKOUT_EXERCISES (Erro: column we.exercise_id does not exist)
        await db.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercise_library(id);
        `);

        // 4. Configurar Plano de Teste (CORREÇÃO JSON AQUI)
        // A coluna 'features' é JSONB, então precisamos passar uma string que pareça um array JSON '["..."]'
        await db.query(`
            INSERT INTO plans (name, price, description, features) 
            VALUES (
                'Momentum Básico', 
                10.00, 
                'Plano de Teste PIX', 
                '["Acesso completo para teste", "Suporte via Chat", "Treinos Ilimitados"]'::jsonb
            )
            ON CONFLICT (name) 
            DO UPDATE SET 
                price = 10.00,
                features = '["Acesso completo para teste", "Suporte via Chat", "Treinos Ilimitados"]'::jsonb;
        `);
        
        console.log("✅ Banco de Dados reparado com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro fatal no reparo:", err);
        process.exit(1);
    }
}

fixDatabase();
