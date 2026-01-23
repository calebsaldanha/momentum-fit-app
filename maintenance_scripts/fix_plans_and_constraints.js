require('dotenv').config();
const db = require('../database/db');

async function fixDB() {
    console.log("���️ Iniciando correção de Planos e Constraints...");
    try {
        // 1. Garantir índice único (necessário para o ON CONFLICT funcionar)
        // Remove duplicatas primeiro para evitar erro ao criar índice
        await db.query(`
            DELETE FROM plans a USING plans b
            WHERE a.id < b.id AND a.name = b.name;
        `);
        // Cria índice único se não existir
        await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS plans_name_idx ON plans (name);`);

        // 2. Inserir ou Atualizar o Plano "Momentum Básico" para R$10,00
        await db.query(`
            INSERT INTO plans (name, price, description, features) 
            VALUES (
                'Momentum Básico', 
                10.00, 
                'Plano ideal para começar sua jornada.', 
                '["Treinos Personalizados", "Suporte via Chat", "Acesso ao App"]'::jsonb
            )
            ON CONFLICT (name) 
            DO UPDATE SET 
                price = 10.00,
                description = 'Plano ideal para começar sua jornada.',
                features = '["Treinos Personalizados", "Suporte via Chat", "Acesso ao App"]'::jsonb;
        `);
        
        // 3. Garantir colunas essenciais (caso o script anterior tenha falhado)
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;`);

        console.log("✅ Banco de Dados corrigido! Plano Básico ativo a R$10,00.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na correção:", err);
        process.exit(1);
    }
}

fixDB();
