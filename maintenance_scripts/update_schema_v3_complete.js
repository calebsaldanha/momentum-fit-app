require('dotenv').config();
const db = require('../database/db');

async function migrate() {
    console.log("��� Iniciando migração V3 (Dados Pessoais, Financeiro e Planos)...");
    
    try {
        // 1. Atualizar Tabela USERS (Dados comuns)
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS birth_date DATE,
            ADD COLUMN IF NOT EXISTS photo_url TEXT;
        `);

        // 2. Atualizar Tabela TRAINERS (Dados profissionais)
        await db.query(`
            ALTER TABLE trainers 
            ADD COLUMN IF NOT EXISTS education TEXT, -- Formação
            ADD COLUMN IF NOT EXISTS experience TEXT, -- Experiência
            ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20), -- CPF, Email, Aleatória
            ADD COLUMN IF NOT EXISTS pix_key VARCHAR(100); -- A chave em si
        `);

        // 3. Atualizar Tabela CLIENTS (Anamnese completa)
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS medical_history TEXT,
            ADD COLUMN IF NOT EXISTS medications TEXT,
            ADD COLUMN IF NOT EXISTS injuries TEXT,
            ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50), -- Sedentário, Ativo...
            ADD COLUMN IF NOT EXISTS goal_description TEXT, -- Detalhe do objetivo
            ADD COLUMN IF NOT EXISTS available_equipment TEXT; -- O que tem pra treinar
        `);

        // 4. Criar Tabela de ASSINATURAS/COBRANÇAS (Foco em PIX)
        await db.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_name VARCHAR(50) DEFAULT 'Básico',
                price NUMERIC(10,2),
                status VARCHAR(20) DEFAULT 'pending', -- active, pending, overdue, cancelled
                start_date DATE DEFAULT CURRENT_DATE,
                next_billing_date DATE,
                payment_method VARCHAR(20) DEFAULT 'PIX'
            );

            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                subscription_id INTEGER REFERENCES subscriptions(id),
                user_id INTEGER REFERENCES users(id),
                amount NUMERIC(10,2),
                payment_date TIMESTAMP,
                status VARCHAR(20), -- paid, pending, failed
                proof_url TEXT, -- URL do comprovante (upload)
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Schema atualizado com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

migrate();
