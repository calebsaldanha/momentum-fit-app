require('dotenv').config();
const db = require('../database/db');

async function fixDatabase() {
    console.log("��� Iniciando reparo final do Banco de Dados (Versão com Índice)...");
    
    try {
        // 1. Corrigir Tabela USERS (Erro: column "active" does not exist)
        console.log("- Verificando coluna active em users...");
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;`);
        
        // 2. Corrigir Tabela CLIENTS (Erro: column c.weight does not exist)
        console.log("- Verificando colunas em clients...");
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
        console.log("- Verificando exercise_id em workout_exercises...");
        await db.query(`
            ALTER TABLE workout_exercises 
            ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercise_library(id);
        `);

        // 4. CRIAR ÍNDICE ÚNICO EM PLANS (ESSENCIAL PARA O UPSERT)
        console.log("- Criando índice único em plans(name)...");
        // Remove duplicatas antes de criar o indice, se houver (para evitar erro)
        await db.query(`
            DELETE FROM plans a USING plans b
            WHERE a.id < b.id AND a.name = b.name;
        `);
        // Cria o índice
        await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS plans_name_unique_idx ON plans (name);`);

        // 5. Configurar Plano de Teste (JSON CORRIGIDO + ÍNDICE GARANTIDO)
        console.log("- Inserindo/Atualizando Plano Momentum Básico...");
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
