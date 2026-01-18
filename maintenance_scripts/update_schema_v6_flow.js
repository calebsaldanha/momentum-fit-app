require('dotenv').config();
const db = require('../database/db');

async function migrate() {
    console.log("Ì∫Ä Iniciando Migra√ß√£o V6 (Fluxo Completo)...");
    try {
        // 1. Garantir Tabela SUBSCRIPTIONS
        await db.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_name VARCHAR(50) DEFAULT 'Free',
                price NUMERIC(10,2) DEFAULT 0.00,
                status VARCHAR(20) DEFAULT 'active',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                next_billing_date TIMESTAMP,
                payment_method VARCHAR(50)
            );
        `);

        // 2. Garantir Tabela PAYMENTS
        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                subscription_id INTEGER REFERENCES subscriptions(id),
                amount NUMERIC(10,2),
                status VARCHAR(20) DEFAULT 'pending',
                payment_date TIMESTAMP,
                proof_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Garantir Colunas de ANAMNESE em Clients
        await db.query(`
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS training_experience VARCHAR(50),
            ADD COLUMN IF NOT EXISTS preferred_training_time VARCHAR(50),
            ADD COLUMN IF NOT EXISTS sleep_quality VARCHAR(50),
            ADD COLUMN IF NOT EXISTS stress_level VARCHAR(50),
            ADD COLUMN IF NOT EXISTS water_intake VARCHAR(50),
            ADD COLUMN IF NOT EXISTS nutrition_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS alcohol_consumption VARCHAR(50),
            ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50),
            ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100),
            ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS goal_description TEXT,
            ADD COLUMN IF NOT EXISTS available_equipment TEXT,
            ADD COLUMN IF NOT EXISTS medical_history TEXT,
            ADD COLUMN IF NOT EXISTS medications TEXT,
            ADD COLUMN IF NOT EXISTS injuries TEXT,
            ADD COLUMN IF NOT EXISTS limitations TEXT;
        `);

        console.log("‚úÖ Schema V6 aplicado! Banco pronto para o fluxo.");
        process.exit(0);
    } catch (err) {
        console.error("‚ùå Erro Schema V6:", err);
        process.exit(1);
    }
}

migrate();
