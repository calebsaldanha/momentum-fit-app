require('dotenv').config();
const db = require('../database/db');

async function updateSchema() {
    console.log("��� Atualizando esquema (Anamnese Extra + Financeiro)...");
    try {
        await db.query('BEGIN');

        // 1. Adicionar colunas de Anamnese Completa na tabela clients
        const newColumns = [
            'ADD COLUMN IF NOT EXISTS daily_activity_level VARCHAR(50)', 
            'ADD COLUMN IF NOT EXISTS alcohol_consumption VARCHAR(50)',   
            'ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT',         
            'ADD COLUMN IF NOT EXISTS liked_exercises TEXT',              
            'ADD COLUMN IF NOT EXISTS disliked_exercises TEXT',           
            'ADD COLUMN IF NOT EXISTS body_measurements JSONB'            
        ];

        for (let col of newColumns) {
            await db.query(`ALTER TABLE clients ${col}`);
        }

        // 2. Criar Tabelas Financeiras
        await db.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                features TEXT,
                billing_cycle VARCHAR(20) DEFAULT 'monthly',
                active BOOLEAN DEFAULT TRUE
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_id INTEGER REFERENCES plans(id),
                amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending', 
                payment_date TIMESTAMP,
                due_date TIMESTAMP DEFAULT NOW(),
                method VARCHAR(50), 
                invoice_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_id INTEGER REFERENCES plans(id),
                status VARCHAR(50) DEFAULT 'active', 
                start_date TIMESTAMP DEFAULT NOW(),
                next_billing_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 3. Seed Básico de Planos
        const plansCheck = await db.query('SELECT count(*) FROM plans');
        if (plansCheck.rows[0].count == 0) {
            await db.query(`
                INSERT INTO plans (name, price, features) VALUES 
                ('Mensal Básico', 89.90, 'Treino personalizado, Chat com treinador'),
                ('Trimestral Pro', 249.90, 'Nutrição, Treino avançado, Avaliação por vídeo'),
                ('Consultoria Premium', 150.00, 'Acompanhamento diário, Ajustes ilimitados')
            `);
            console.log("✅ Planos padrão criados.");
        }

        await db.query('COMMIT');
        console.log("✅ Esquema atualizado com sucesso!");
    } catch (error) {
        await db.query('ROLLBACK');
        console.error("❌ Erro ao atualizar:", error);
    } finally {
        process.exit();
    }
}

updateSchema();
