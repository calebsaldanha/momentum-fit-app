require('dotenv').config();
const db = require('../database/db');

async function fixDatabase() {
    console.log("��� Iniciando reparo final do Banco de Dados...");
    
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

        // 4. Configurar Plano de Teste (R$ 10,00)
        // Garante que o plano "Momentum Básico" custe 10.00 e esteja disponível
        await db.query(`
            INSERT INTO plans (name, price, description, features) 
            VALUES ('Momentum Básico', 10.00, 'Plano de Teste PIX', 'Acesso completo para teste')
            ON CONFLICT (name) 
            DO UPDATE SET price = 10.00;
        `);
        
        // Atualiza para garantir que planos antigos tenham preço numérico correto
        await db.query(`UPDATE plans SET price = 10.00 WHERE name = 'Momentum Básico'`);

        console.log("✅ Banco de Dados reparado com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro fatal no reparo:", err);
        process.exit(1);
    }
}

fixDatabase();
